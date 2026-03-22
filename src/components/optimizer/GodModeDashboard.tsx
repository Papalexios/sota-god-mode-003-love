import { useState, useMemo } from 'react';
import { useGodModeEngine } from '@/hooks/useGodModeEngine';
import { useOptimizerStore } from '@/lib/store';
import {
  Zap, Play, Pause, Square, Settings, Activity, Clock,
  CheckCircle2, XCircle, AlertTriangle, Loader2, RefreshCw,
  BarChart3, FileText, ExternalLink, Target, TrendingUp, Eye,
  Shield, Gauge, Timer, Cpu, Sparkles, Layers, ArrowUpRight,
  CircleDot
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { GodModeConfigPanel } from './GodModeConfigPanel';
import { GodModeActivityFeed } from './GodModeActivityFeed';
import { GodModeQueuePanel } from './GodModeQueuePanel';
import { GodModeContentPreview } from './GodModeContentPreview';
import type { GodModeHistoryItem } from '@/lib/sota/GodModeTypes';

export function GodModeDashboard() {
  const { state, isRunning, isPaused, start, stop, pause, resume } = useGodModeEngine();
  const { sitemapUrls, priorityUrls, priorityOnlyMode, setPriorityOnlyMode } = useOptimizerStore();
  const [showConfig, setShowConfig] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [previewItem, setPreviewItem] = useState<GodModeHistoryItem | null>(null);

  const priorityProgress = useMemo(() => {
    if (!priorityOnlyMode || priorityUrls.length === 0) return null;
    const completed = state.stats.totalProcessed;
    const total = priorityUrls.length;
    const pct = Math.min(100, Math.round((completed / total) * 100));
    return { completed, total, pct };
  }, [priorityOnlyMode, priorityUrls.length, state.stats.totalProcessed]);

  const successRate = useMemo(() => {
    if (state.stats.totalProcessed === 0) return 0;
    return Math.round((state.stats.successCount / state.stats.totalProcessed) * 100);
  }, [state.stats.successCount, state.stats.totalProcessed]);

  const handleStart = async () => {
    setIsStarting(true);
    try {
      await start();
      toast.success('⚡ God Mode activated!', { description: 'Autonomous engine is now running.' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start');
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = () => { stop(); toast.info('God Mode stopped'); };
  const handlePauseResume = () => {
    if (isPaused) { resume(); toast.info('Resumed'); }
    else { pause(); toast.info('Paused'); }
  };

  const formatTime = (date: Date | null) => {
    if (!date) return '—';
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getPhaseLabel = () => {
    const labels: Record<string, string> = {
      scanning: 'Scanning Sitemap', scoring: 'Scoring Pages',
      generating: 'Generating Content', publishing: 'Publishing',
    };
    return labels[state.currentPhase] || 'Idle';
  };

  return (
    <div className="space-y-4">
      {/* Priority Only Mode Banner */}
      {priorityOnlyMode && (
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 rounded-2xl p-5">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-amber-500/15 rounded-xl flex items-center justify-center border border-amber-500/15">
                <Target className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-bold text-amber-300 text-base tracking-tight">Priority Only Mode</h3>
                <p className="text-sm text-amber-400/60 mt-0.5">
                  {priorityUrls.length} URL{priorityUrls.length !== 1 ? 's' : ''} queued • Sitemap scanning disabled
                </p>
              </div>
            </div>
            <button
              onClick={() => setPriorityOnlyMode(false)}
              disabled={isRunning}
              className="px-3.5 py-2 bg-amber-500/10 text-amber-300 rounded-lg text-sm font-medium border border-amber-500/15 hover:bg-amber-500/20 disabled:opacity-30 transition-all"
            >
              Switch to Full Sitemap
            </button>
          </div>
          {priorityProgress && isRunning && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-amber-400/60 mb-1.5">
                <span>{priorityProgress.completed}/{priorityProgress.total} processed</span>
                <span className="font-mono font-bold text-amber-300">{priorityProgress.pct}%</span>
              </div>
              <div className="h-1.5 bg-amber-900/20 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-700" style={{ width: `${priorityProgress.pct}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ COMMAND CENTER HEADER ═══ */}
      <div className="glass-card rounded-2xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-accent/3" />
        <div className="relative p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-500",
                  isRunning && !isPaused
                    ? "bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/30 shadow-lg shadow-emerald-500/10"
                    : "bg-gradient-to-br from-primary/10 to-accent/10 border-border"
                )}>
                  <Zap className={cn("w-7 h-7", isRunning ? "text-emerald-400" : "text-primary")} />
                </div>
                {isRunning && !isPaused && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-card">
                    <span className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-60" />
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold text-foreground tracking-tight">God Mode 2.0</h2>
                  <StatusBadge status={state.status} />
                  {priorityOnlyMode && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/15">Priority</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {isRunning ? `${getPhaseLabel()} — ${state.currentUrl ? new URL(state.currentUrl).pathname.split('/').pop() : 'preparing...'}` :
                    priorityOnlyMode ? `${priorityUrls.length} priority URLs ready` : 'Autonomous SOTA content engine'}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {!isRunning && !priorityOnlyMode && priorityUrls.length > 0 && (
                <button onClick={() => setPriorityOnlyMode(true)} className="px-3 py-2 bg-amber-500/8 text-amber-400 rounded-xl text-sm font-medium border border-amber-500/12 hover:bg-amber-500/15 transition-all flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" /> Priority
                </button>
              )}
              <button onClick={() => setShowConfig(!showConfig)} className={cn("p-2 rounded-xl transition-all border", showConfig ? "bg-primary/10 text-primary border-primary/20" : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50")}>
                <Settings className="w-4.5 h-4.5" />
              </button>
              {isRunning ? (
                <>
                  <button onClick={handlePauseResume} className={cn("px-3.5 py-2 rounded-xl font-medium flex items-center gap-1.5 text-sm transition-all border", isPaused ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/15" : "bg-amber-500/10 text-amber-400 border-amber-500/15")}>
                    {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    {isPaused ? 'Resume' : 'Pause'}
                  </button>
                  <button onClick={handleStop} className="px-3.5 py-2 bg-red-500/8 text-red-400 rounded-xl font-medium flex items-center gap-1.5 text-sm border border-red-500/15 hover:bg-red-500/15 transition-all">
                    <Square className="w-3.5 h-3.5" /> Stop
                  </button>
                </>
              ) : (
                <button
                  onClick={handleStart}
                  disabled={isStarting || (priorityOnlyMode ? priorityUrls.length === 0 : (sitemapUrls.length === 0 && priorityUrls.length === 0))}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold flex items-center gap-2 text-sm hover:from-emerald-500 hover:to-teal-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/15 hover:shadow-emerald-500/25"
                >
                  {isStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : priorityOnlyMode ? <Target className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                  {isStarting ? 'Starting...' : priorityOnlyMode ? `Process ${priorityUrls.length} URLs` : 'Activate God Mode'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Metrics strip */}
        <div className="grid grid-cols-5 border-t border-border/50 divide-x divide-border/50 bg-muted/10">
          <MetricCell icon={<Activity className="w-3 h-3" />} label="Cycle" value={state.stats.cycleCount} />
          <MetricCell icon={<Layers className="w-3 h-3" />} label="Queue" value={state.queue.length} />
          <MetricCell icon={<Clock className="w-3 h-3" />} label={priorityOnlyMode ? 'Mode' : 'Last Scan'} value={priorityOnlyMode ? 'Priority' : formatTime(state.stats.lastScanAt)} />
          <MetricCell icon={<Timer className="w-3 h-3" />} label={priorityOnlyMode ? 'Remaining' : 'Next Scan'} value={priorityOnlyMode ? `${state.queue.length}/${priorityUrls.length}` : formatTime(state.stats.nextScanAt)} />
          <MetricCell icon={<Cpu className="w-3 h-3" />} label="Phase" value={getPhaseLabel()} highlight={isRunning} />
        </div>
      </div>

      {showConfig && <GodModeConfigPanel onClose={() => setShowConfig(false)} />}

      {/* ═══ STATS GRID — 6 Cards ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <StatCard icon={<FileText className="w-4 h-4" />} color="blue" value={state.stats.totalProcessed} label="Processed" />
        <StatCard icon={<CheckCircle2 className="w-4 h-4" />} color="green" value={state.stats.successCount} label="Success" />
        <StatCard icon={<XCircle className="w-4 h-4" />} color="red" value={state.stats.errorCount} label="Errors" />
        <StatCard
          icon={<TrendingUp className="w-4 h-4" />}
          color={state.stats.avgQualityScore >= 90 ? "green" : state.stats.avgQualityScore >= 80 ? "amber" : "zinc"}
          value={`${state.stats.avgQualityScore.toFixed(0)}%`}
          label="Avg Quality"
        />
        <StatCard icon={<BarChart3 className="w-4 h-4" />} color="sky" value={state.stats.totalWordsGenerated.toLocaleString()} label="Words" />
        <StatCard icon={<Target className="w-4 h-4" />} color="emerald" value={`${successRate}%`} label="Success Rate" />
      </div>

      {/* SOTA Quality Badge */}
      {state.stats.avgQualityScore >= 90 && state.stats.totalProcessed > 0 && (
        <div className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-emerald-500/8 to-teal-500/4 border border-emerald-500/15 rounded-xl">
          <div className="w-8 h-8 bg-emerald-500/15 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex-1">
            <span className="text-sm font-bold text-emerald-300">SOTA Quality Achieved</span>
            <span className="text-sm text-emerald-400/60 ml-2">{state.stats.avgQualityScore.toFixed(1)}% avg • {state.stats.totalProcessed} articles</span>
          </div>
          <Sparkles className="w-4 h-4 text-emerald-400/40" />
        </div>
      )}

      {/* Current Processing */}
      {state.currentUrl && (
        <div className="flex items-center gap-4 p-4 glass-card border-primary/15 rounded-xl bg-primary/3 relative overflow-hidden">
          <div className="absolute inset-0 animate-shimmer" />
          <div className="relative w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center">
            {state.currentPhase === 'generating' ? <Loader2 className="w-5 h-5 text-primary animate-spin" /> :
              state.currentPhase === 'scanning' ? <RefreshCw className="w-5 h-5 text-primary animate-spin" /> :
                state.currentPhase === 'scoring' ? <Gauge className="w-5 h-5 text-primary" /> :
                  <ExternalLink className="w-5 h-5 text-primary" />}
          </div>
          <div className="relative flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-0.5">
              {getPhaseLabel()}
              <CircleDot className="w-2.5 h-2.5 animate-pulse" />
            </div>
            <div className="text-sm font-medium text-foreground truncate">{state.currentUrl}</div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GodModeActivityFeed />
        <GodModeQueuePanel />
      </div>

      {/* History */}
      <div className="glass-card border border-border/50 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50 bg-muted/5">
          <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Processing History
          </h3>
          <span className="text-xs font-mono font-medium text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-md">{state.history.length}</span>
        </div>
        <div className="max-h-72 overflow-y-auto custom-scrollbar">
          {state.history.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 bg-muted/20 rounded-2xl flex items-center justify-center mb-3">
                <FileText className="w-7 h-7 text-muted-foreground/30" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">No processing history yet</p>
              <p className="text-xs text-muted-foreground/50 mt-1">Activate God Mode to begin</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {state.history.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/5 transition-colors group">
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                    item.action === 'published' && "bg-emerald-500/15",
                    item.action === 'generated' && "bg-blue-500/15",
                    item.action === 'skipped' && "bg-amber-500/15",
                    item.action === 'error' && "bg-red-500/15"
                  )}>
                    {item.action === 'published' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    {item.action === 'generated' && <FileText className="w-3.5 h-3.5 text-blue-400" />}
                    {item.action === 'skipped' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                    {item.action === 'error' && <XCircle className="w-3.5 h-3.5 text-red-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground/90 truncate group-hover:text-foreground transition-colors">
                      {(() => { try { const p = new URL(item.url).pathname; return p === '/' ? item.url : p.split('/').filter(Boolean).pop() || item.url; } catch { return item.url; } })()}
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {new Date(item.timestamp).toLocaleTimeString()}</span>
                      {item.qualityScore != null && (
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold",
                          item.qualityScore >= 90 ? "bg-emerald-500/10 text-emerald-400" : item.qualityScore >= 80 ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"
                        )}>QS:{item.qualityScore}%</span>
                      )}
                      {item.wordCount != null && <span className="font-mono text-muted-foreground/50">{item.wordCount.toLocaleString()}w</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.generatedContent && (
                      <button onClick={() => setPreviewItem(item)} className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-primary/5 transition-colors" title="Preview">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {item.wordPressUrl && (
                      <a href={item.wordPressUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-muted-foreground hover:text-emerald-400 rounded-lg hover:bg-emerald-500/5 transition-colors">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Prerequisites Warning */}
      {sitemapUrls.length === 0 && priorityUrls.length === 0 && (
        <div className="flex items-center gap-3 p-3.5 bg-amber-500/5 border border-amber-500/12 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-400/70">
            <span className="font-semibold text-amber-400">No URLs available.</span> Crawl your sitemap or add priority URLs first.
          </p>
        </div>
      )}

      {previewItem && <GodModeContentPreview item={previewItem} onClose={() => setPreviewItem(null)} />}
    </div>
  );
}

// ═══ Sub-components ═══

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    running: "bg-emerald-500/10 text-emerald-400 border-emerald-500/15",
    paused: "bg-amber-500/10 text-amber-400 border-amber-500/15",
    error: "bg-red-500/10 text-red-400 border-red-500/15",
    idle: "bg-muted/30 text-muted-foreground border-border/50",
  };
  return (
    <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider border", styles[status] || styles.idle)}>
      {status}
    </span>
  );
}

function MetricCell({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-0.5">{icon}{label}</div>
      <div className={cn("text-sm font-bold tabular-nums truncate", highlight ? "text-primary" : "text-foreground")}>{value}</div>
    </div>
  );
}

function StatCard({ icon, color, value, label }: { icon: React.ReactNode; color: string; value: string | number; label: string }) {
  const colorMap: Record<string, { bg: string; text: string; glow: string }> = {
    blue: { bg: 'bg-blue-500/8', text: 'text-blue-400', glow: 'shadow-blue-500/5' },
    green: { bg: 'bg-emerald-500/8', text: 'text-emerald-400', glow: 'shadow-emerald-500/5' },
    red: { bg: 'bg-red-500/8', text: 'text-red-400', glow: 'shadow-red-500/5' },
    amber: { bg: 'bg-amber-500/8', text: 'text-amber-400', glow: 'shadow-amber-500/5' },
    sky: { bg: 'bg-sky-500/8', text: 'text-sky-400', glow: 'shadow-sky-500/5' },
    emerald: { bg: 'bg-emerald-500/8', text: 'text-emerald-400', glow: 'shadow-emerald-500/5' },
    zinc: { bg: 'bg-zinc-500/8', text: 'text-zinc-400', glow: '' },
  };
  const c = colorMap[color] || colorMap.zinc;

  return (
    <div className={cn("glass-card stat-card-glow rounded-xl p-4 hover:-translate-y-0.5 transition-all group", c.glow)}>
      <div className="flex items-center gap-3">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform", c.bg, c.text)}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className={cn("text-xl font-bold tabular-nums truncate tracking-tight", c.text)}>{value}</div>
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</div>
        </div>
      </div>
    </div>
  );
}
