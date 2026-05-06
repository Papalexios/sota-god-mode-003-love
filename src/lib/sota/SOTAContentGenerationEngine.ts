// src/lib/sota/SOTAContentGenerationEngine.ts
// ═══════════════════════════════════════════════════════════════════════════════
// SOTA CONTENT GENERATION ENGINE v2.4 — SOTA GOD-MODE MULTI-MODEL
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  AIModel,
  APIKeys,
  GenerationParams,
  GenerationResult,
  ConsensusResult,
} from './types';
import { generationCache } from './cache';

// ─────────────────────────────────────────────────────────────────────────────
// Model configurations with dynamic model ID support
// ─────────────────────────────────────────────────────────────────────────────

interface ModelConfig {
  endpoint: string;
  modelId: string;
  weight: number;
  maxTokens: number;
}

const DEFAULT_MODEL_CONFIGS: Record<AIModel, ModelConfig> = {
  gemini: {
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    modelId: 'gemini-2.0-flash-exp', // SOTA: Latest Gemini 2.0 Flash
    weight: 1.0,
    maxTokens: 16384,
  },
  openai: {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    modelId: 'gpt-4o',
    weight: 1.0,
    maxTokens: 16384,
  },
  anthropic: {
    endpoint: 'https://api.anthropic.com/v1/messages',
    modelId: 'claude-3-5-sonnet-20241022', // SOTA: Latest Sonnet 3.5 (New)
    weight: 1.0,
    maxTokens: 8192,
  },
  openrouter: {
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    modelId: 'anthropic/claude-3.5-sonnet:beta',
    weight: 0.9,
    maxTokens: 8192,
  },
  groq: {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    modelId: 'llama-3.3-70b-versatile',
    weight: 0.8,
    maxTokens: 8192,
  },
};

export interface ExtendedAPIKeys extends APIKeys {
  openrouterModelId?: string;
  groqModelId?: string;
  fallbackModels?: string[];
}

const MAX_RETRIES = 4; // Respect user's chosen model — retry it before considering user-defined fallbacks.
const RETRYABLE_STATUS_CODES = [408, 409, 425, 429, 500, 502, 503, 504, 520, 522, 524];
// Per-provider timeouts. Free OpenRouter models (e.g. tencent/hy3-preview:free)
// route through slow community backends and routinely take 3-5+ minutes for a
// long-form article. Aborting at 90s wastes the user's chosen free model and
// surfaces as "Generation timed out". Give the chosen provider real time to
// finish before we ever consider falling back.
const PROVIDER_TIMEOUT_MS: Record<string, number> = {
  gemini: 180_000,
  openai: 180_000,
  anthropic: 180_000,
  openrouter: 480_000, // 8 min — covers free-tier routed backends
  groq: 120_000,
};
const DEFAULT_PROVIDER_TIMEOUT_MS = 180_000;
const TRUNCATED_FINISH_REASONS = new Set(['length', 'max_tokens', 'max_output_tokens', 'MAX_TOKENS']);

interface ProviderCallResult {
  content: string;
  tokens: number;
  finishReason?: string;
}

function simpleHash(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export class SOTAContentGenerationEngine {
  private apiKeys: ExtendedAPIKeys;
  private onProgress?: (message: string) => void;
  private modelConfigs: Record<string, ModelConfig>;
  private fallbackInFlight = new Set<string>();

  constructor(apiKeys: ExtendedAPIKeys, onProgress?: (message: string) => void) {
    this.apiKeys = apiKeys;
    this.onProgress = onProgress;
    this.modelConfigs = { ...DEFAULT_MODEL_CONFIGS };

    if (apiKeys.openrouterModelId) {
      this.modelConfigs.openrouter = { ...this.modelConfigs.openrouter, modelId: apiKeys.openrouterModelId };
    }
    if (apiKeys.groqModelId) {
      this.modelConfigs.groq = { ...this.modelConfigs.groq, modelId: apiKeys.groqModelId };
    }
  }

  private log(message: string): void {
    this.onProgress?.(message);
    console.log(`[SOTA Engine] ${message}`);
  }

  private getApiKey(model: AIModel): string | undefined {
    const keyMap: Record<string, keyof ExtendedAPIKeys> = {
      gemini: 'geminiApiKey',
      openai: 'openaiApiKey',
      anthropic: 'anthropicApiKey',
      openrouter: 'openrouterApiKey',
      groq: 'groqApiKey',
    };
    return this.apiKeys[keyMap[model]] as string | undefined;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Hard timeout for any AI provider call. Without this, a stalled stream
   * (e.g. OpenRouter routing to a slow DeepInfra/Novita backend) can hang
   * the entire pipeline indefinitely while still burning tokens on retries.
   * Default: 2 minutes per attempt, then retry/fallback.
   */
  private async fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number = DEFAULT_PROVIDER_TIMEOUT_MS): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new Error(`AI request timed out after ${Math.round(timeoutMs / 1000)}s — provider stalled. Falling back...`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private timeoutFor(model: AIModel): number {
    return PROVIDER_TIMEOUT_MS[model] ?? DEFAULT_PROVIDER_TIMEOUT_MS;
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const msg = error.message;
      return RETRYABLE_STATUS_CODES.some(code => msg.includes(String(code))) ||
        msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT') ||
        msg.includes('ERR_HTTP2_PROTOCOL_ERROR') || msg.includes('fetch failed') ||
        msg.includes('timed out') || msg.includes('AbortError');
    }
    return false;
  }

  private countWords(text: string): number {
    return text.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;
  }

  private validateGeneration(content: string, params: GenerationParams, finishReason?: string, modelId?: string): void {
    const trimmed = (content || '').trim();
    const validation = params.validation;
    const label = `${params.model}${modelId ? `/${modelId}` : ''}`;

    if (!trimmed) throw new Error(`${label} returned an empty response.`);
    if (finishReason && TRUNCATED_FINISH_REASONS.has(finishReason)) {
      throw new Error(`${label} output was truncated by token limits (${finishReason}). Falling back...`);
    }
    if (!validation) return;

    const minChars = validation.minChars ?? 0;
    const minWords = validation.minWords ?? 0;
    if (minChars > 0 && trimmed.length < minChars) {
      throw new Error(`${label} returned insufficient generated content (${trimmed.length}/${minChars} chars).`);
    }
    if (minWords > 0 && this.countWords(trimmed) < minWords) {
      throw new Error(`${label} returned insufficient generated content (${this.countWords(trimmed)}/${minWords} words).`);
    }
    if (validation.type === 'article-html' || validation.requireCompleteArticle) {
      const hasOpeningArticle = /<article\b/i.test(trimmed);
      const hasClosingArticle = /<\/article>\s*$/i.test(trimmed) || /<\/article>/i.test(trimmed);
      const hasHeadings = /<h[12]\b/i.test(trimmed);
      const hasParagraphs = (trimmed.match(/<p\b/gi) || []).length >= 4;
      if (!hasOpeningArticle || !hasClosingArticle || !hasHeadings || !hasParagraphs) {
        throw new Error(`${label} returned invalid article HTML. Falling back...`);
      }
    }
  }

  async generateWithModel(params: GenerationParams): Promise<GenerationResult> {
    const { prompt, model, systemPrompt, temperature = 0.7, maxTokens } = params;
    const apiKey = this.getApiKey(model);
    if (!apiKey) throw new Error(`No API key configured for ${model}`);

    const config = (this.modelConfigs[model] || DEFAULT_MODEL_CONFIGS[model]) as ModelConfig;
    const cacheKey = `${model}:${config.modelId}:${simpleHash(prompt)}:${simpleHash(systemPrompt || '')}`;
    const cached = generationCache.get<GenerationResult>(cacheKey);
    if (cached) {
      try {
        this.validateGeneration(cached.content, params, cached.finishReason, cached.modelId || config.modelId);
        generationCache.recordHit();
        return { ...cached, cached: true };
      } catch {
        generationCache.recordMiss();
      }
    } else {
      generationCache.recordMiss();
    }

    const finalMaxTokens = maxTokens || config.maxTokens;
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const backoffMs = Math.min(1500 * Math.pow(2, attempt), 12000);
        this.log(`Retrying ${model} (attempt ${attempt + 1}/${MAX_RETRIES + 1}) after ${backoffMs}ms...`);
        await this.sleep(backoffMs);
      }

      const startTime = Date.now();
      try {
        let providerResult: ProviderCallResult = { content: '', tokens: 0 };

        const providerTimeout = this.timeoutFor(model);
        if (model === 'gemini') {
          providerResult = await this.callGemini(apiKey, prompt, systemPrompt, temperature, finalMaxTokens, providerTimeout);
        } else if (model === 'openai') {
          providerResult = await this.callOpenAI(apiKey, prompt, systemPrompt, temperature, finalMaxTokens, providerTimeout);
        } else if (model === 'anthropic') {
          providerResult = await this.callAnthropic(apiKey, prompt, systemPrompt, temperature, finalMaxTokens, providerTimeout);
        } else if (model === 'openrouter' || model === 'groq') {
          providerResult = await this.callOpenAICompatible(config.endpoint, apiKey, config.modelId, prompt, systemPrompt, temperature, finalMaxTokens, providerTimeout);
        }

        this.validateGeneration(providerResult.content, params, providerResult.finishReason, config.modelId);

        const result: GenerationResult = {
          content: providerResult.content,
          model,
          modelId: config.modelId,
          tokensUsed: providerResult.tokens,
          duration: Date.now() - startTime,
          cached: false,
          finishReason: providerResult.finishReason
        };
        generationCache.set(cacheKey, result);
        return result;
      } catch (error) {
        lastError = error;
        if (attempt < MAX_RETRIES && this.isRetryableError(error)) continue;
        break;
      }
    }

    // STRICT MODEL POLICY: Only use fallbacks the user EXPLICITLY configured.
    // Never silently switch to another provider/model — that burns user credits
    // on models they did not choose. If the user picked e.g. a free OpenRouter
    // model, we must respect that choice and fail loudly instead of falling
    // back to a paid model behind their back.
    const fallbackModels = Array.from(new Set((this.apiKeys.fallbackModels || []) as string[]));
    if (fallbackModels.length === 0) {
      this.log(`Strict model policy: no user-defined fallbacks. Failing on ${model} instead of switching providers.`);
    }
    if (fallbackModels.length > 0) {
      for (const fallbackEntry of fallbackModels) {
        const colonIdx = fallbackEntry.indexOf(':');
        const fallbackProvider = (colonIdx > 0 ? fallbackEntry.substring(0, colonIdx) : fallbackEntry) as AIModel;
        const fallbackModelId = colonIdx > 0 ? fallbackEntry.substring(colonIdx + 1) : undefined;
        if (!DEFAULT_MODEL_CONFIGS[fallbackProvider]) continue;

        const activeModelId = (this.modelConfigs[model] || DEFAULT_MODEL_CONFIGS[model])?.modelId;
        if (fallbackProvider === model && (!fallbackModelId || fallbackModelId === activeModelId)) continue;
        const fallbackKey = `${fallbackProvider}:${fallbackModelId || (this.modelConfigs[fallbackProvider] || DEFAULT_MODEL_CONFIGS[fallbackProvider])?.modelId || 'default'}`;
        if (this.fallbackInFlight.has(fallbackKey)) continue;

        const fallbackApiKey = this.getApiKey(fallbackProvider);
        if (!fallbackApiKey) continue;

        this.log(`Engaging fallback: ${fallbackProvider} ${fallbackModelId || ''}`);
        const previousConfig = this.modelConfigs[fallbackProvider];
        try {
          this.fallbackInFlight.add(fallbackKey);
          if (fallbackModelId) {
            this.modelConfigs[fallbackProvider] = {
              ...(this.modelConfigs[fallbackProvider] || DEFAULT_MODEL_CONFIGS[fallbackProvider]),
              modelId: fallbackModelId,
            };
          }
          return await this.generateWithModel({ ...params, model: fallbackProvider });
        } catch {
          continue;
        } finally {
          if (fallbackModelId && previousConfig) this.modelConfigs[fallbackProvider] = previousConfig;
          this.fallbackInFlight.delete(fallbackKey);
        }
      }
    }

    throw lastError;
  }

  private async callGemini(apiKey: string, prompt: string, systemPrompt?: string, temperature: number = 0.7, maxTokens: number = 8192, timeoutMs: number = DEFAULT_PROVIDER_TIMEOUT_MS): Promise<ProviderCallResult> {
    const url = `${this.modelConfigs.gemini.endpoint}/${this.modelConfigs.gemini.modelId}:generateContent?key=${apiKey}`;
    const contents = [{ role: 'user', parts: [{ text: prompt }] }];
    const requestBody: any = {
      contents,
      generationConfig: { temperature, maxOutputTokens: maxTokens }
    };
    if (systemPrompt) requestBody.system_instruction = { parts: [{ text: systemPrompt }] };

    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    }, timeoutMs);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error ${response.status}: ${JSON.stringify(errorData)}`);
    }
    const data = await response.json();
    const candidate = data.candidates?.[0] || {};
    return {
      content: candidate.content?.parts?.map((p: any) => p.text || '').join('') || '',
      tokens: data.usageMetadata?.totalTokenCount || 0,
      finishReason: candidate.finishReason,
    };
  }

  private async callOpenAI(apiKey: string, prompt: string, systemPrompt?: string, temperature: number = 0.7, maxTokens: number = 4096, timeoutMs: number = DEFAULT_PROVIDER_TIMEOUT_MS): Promise<ProviderCallResult> {
    const messages: any[] = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const response = await this.fetchWithTimeout(this.modelConfigs.openai.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: this.modelConfigs.openai.modelId,
        messages,
        temperature,
        max_tokens: maxTokens
      })
    }, timeoutMs);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`OpenAI API error ${response.status}: ${errorText.slice(0, 500)}`);
    }
    const data = await response.json();
    const choice = data.choices?.[0] || {};
    return {
      content: choice.message?.content || '',
      tokens: data.usage?.total_tokens || 0,
      finishReason: choice.finish_reason,
    };
  }

  private async callAnthropic(apiKey: string, prompt: string, systemPrompt?: string, temperature: number = 0.7, maxTokens: number = 4096, timeoutMs: number = DEFAULT_PROVIDER_TIMEOUT_MS): Promise<ProviderCallResult> {
    const response = await this.fetchWithTimeout(this.modelConfigs.anthropic.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: this.modelConfigs.anthropic.modelId,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
        temperature
      })
    }, timeoutMs);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Anthropic API error ${response.status}: ${JSON.stringify(errorData)}`);
    }
    const data = await response.json();
    return {
      content: data.content?.[0]?.text || '',
      tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      finishReason: data.stop_reason,
    };
  }

  private async callOpenAICompatible(endpoint: string, apiKey: string, modelId: string, prompt: string, systemPrompt?: string, temperature: number = 0.7, maxTokens: number = 4096, timeoutMs: number = DEFAULT_PROVIDER_TIMEOUT_MS): Promise<ProviderCallResult> {
    const messages: any[] = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const response = await this.fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        temperature,
        max_tokens: maxTokens
      })
    }, timeoutMs);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`${modelId} API error ${response.status}: ${errorText.slice(0, 500)}`);
    }
    const data = await response.json();
    const choice = data.choices?.[0] || {};
    return {
      content: choice.message?.content || '',
      tokens: data.usage?.total_tokens || 0,
      finishReason: choice.finish_reason,
    };
  }

  getAvailableModels(): AIModel[] {
    const models: AIModel[] = ['gemini', 'openai', 'anthropic', 'openrouter', 'groq'];
    return models.filter(model => this.getApiKey(model));
  }
}

export function createSOTAEngine(apiKeys: APIKeys, onProgress?: (message: string) => void) {
  return new SOTAContentGenerationEngine(apiKeys, onProgress);
}
