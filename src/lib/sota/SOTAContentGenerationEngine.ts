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

const MAX_RETRIES = 3; // Increased for SOTA resilience
const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];

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
   * Default: 4 minutes per attempt.
   */
  private async fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 240_000): Promise<Response> {
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

  async generateWithModel(params: GenerationParams): Promise<GenerationResult> {
    const { prompt, model, systemPrompt, temperature = 0.7, maxTokens } = params;
    const apiKey = this.getApiKey(model);
    if (!apiKey) throw new Error(`No API key configured for ${model}`);

    const cacheKey = `${model}:${simpleHash(prompt)}:${simpleHash(systemPrompt || '')}`;
    const cached = generationCache.get<GenerationResult>(cacheKey);
    if (cached) {
      generationCache.recordHit();
      return { ...cached, cached: true };
    }
    generationCache.recordMiss();

    const config = (this.modelConfigs[model] || DEFAULT_MODEL_CONFIGS[model]) as ModelConfig;
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
        let content = '';
        let tokensUsed = 0;

        if (model === 'gemini') {
          content = await this.callGemini(apiKey, prompt, systemPrompt, temperature, finalMaxTokens);
        } else if (model === 'openai') {
          const r = await this.callOpenAI(apiKey, prompt, systemPrompt, temperature, finalMaxTokens);
          content = r.content;
          tokensUsed = r.tokens;
        } else if (model === 'anthropic') {
          const r = await this.callAnthropic(apiKey, prompt, systemPrompt, temperature, finalMaxTokens);
          content = r.content;
          tokensUsed = r.tokens;
        } else if (model === 'openrouter' || model === 'groq') {
          const r = await this.callOpenAICompatible(config.endpoint, apiKey, config.modelId, prompt, systemPrompt, temperature, finalMaxTokens);
          content = r.content;
          tokensUsed = r.tokens;
        }

        const result: GenerationResult = {
          content,
          model,
          tokensUsed,
          duration: Date.now() - startTime,
          cached: false
        };
        generationCache.set(cacheKey, result);
        return result;
      } catch (error) {
        lastError = error;
        if (attempt < MAX_RETRIES && this.isRetryableError(error)) continue;
        break;
      }
    }

    // Fallback logic
    const fallbackModels = (this.apiKeys.fallbackModels || []) as string[];
    if (fallbackModels.length > 0) {
      for (const fallbackEntry of fallbackModels) {
        const colonIdx = fallbackEntry.indexOf(':');
        const fallbackProvider = (colonIdx > 0 ? fallbackEntry.substring(0, colonIdx) : fallbackEntry) as AIModel;
        const fallbackModelId = colonIdx > 0 ? fallbackEntry.substring(colonIdx + 1) : undefined;

        if (fallbackProvider === model && !fallbackModelId) continue;

        const fallbackApiKey = this.getApiKey(fallbackProvider);
        if (!fallbackApiKey) continue;

        this.log(`Engaging fallback: ${fallbackProvider} ${fallbackModelId || ''}`);
        try {
          return await this.generateWithModel({ ...params, model: fallbackProvider });
        } catch {
          continue;
        }
      }
    }

    throw lastError;
  }

  private async callGemini(apiKey: string, prompt: string, systemPrompt?: string, temperature: number = 0.7, maxTokens: number = 8192): Promise<string> {
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
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error ${response.status}: ${JSON.stringify(errorData)}`);
    }
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  private async callOpenAI(apiKey: string, prompt: string, systemPrompt?: string, temperature: number = 0.7, maxTokens: number = 4096): Promise<{ content: string; tokens: number }> {
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
    });

    if (!response.ok) throw new Error(`OpenAI API error ${response.status}`);
    const data = await response.json();
    return {
      content: data.choices?.[0]?.message?.content || '',
      tokens: data.usage?.total_tokens || 0
    };
  }

  private async callAnthropic(apiKey: string, prompt: string, systemPrompt?: string, temperature: number = 0.7, maxTokens: number = 4096): Promise<{ content: string; tokens: number }> {
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
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Anthropic API error ${response.status}: ${JSON.stringify(errorData)}`);
    }
    const data = await response.json();
    return {
      content: data.content?.[0]?.text || '',
      tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
    };
  }

  private async callOpenAICompatible(endpoint: string, apiKey: string, modelId: string, prompt: string, systemPrompt?: string, temperature: number = 0.7, maxTokens: number = 4096): Promise<{ content: string; tokens: number }> {
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
    });

    if (!response.ok) throw new Error(`${modelId} API error ${response.status}`);
    const data = await response.json();
    return {
      content: data.choices?.[0]?.message?.content || '',
      tokens: data.usage?.total_tokens || 0
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
