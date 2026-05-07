// src/components/optimizer/AuthorProfilesPanel.tsx
// Author Library + Brand-Voice Fingerprint manager (M2 — E-E-A-T).
// Authors flow into the orchestrator → Person + Article JSON-LD + system prompt byline.
// Voice samples are analyzed locally → fingerprint injected into the prompt.

import { useState } from 'react';
import { useOptimizerStore } from '@/lib/store';
import { extractVoiceFingerprint, type AuthorProfile } from '@/lib/sota/AuthorProfiles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, User, Sparkles, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const empty = (): AuthorProfile => ({
  id: crypto.randomUUID(),
  name: '',
  bio: '',
  jobTitle: '',
  credentials: [],
  expertiseAreas: [],
  social: [],
});

export function AuthorProfilesPanel() {
  const {
    authors, activeAuthorId, upsertAuthor, removeAuthor, setActiveAuthor,
    voiceFingerprint, voiceSamples, setVoiceSamples, setVoiceFingerprint,
  } = useOptimizerStore();

  const [editing, setEditing] = useState<AuthorProfile | null>(null);
  const [samplesText, setSamplesText] = useState(voiceSamples.join('\n\n---\n\n'));

  const startEdit = (a?: AuthorProfile) => setEditing(a ? { ...a } : empty());
  const save = () => {
    if (!editing) return;
    if (!editing.name.trim()) { toast.error('Name is required'); return; }
    upsertAuthor(editing);
    toast.success(`Saved ${editing.name}`);
    setEditing(null);
  };

  const analyzeVoice = () => {
    const samples = samplesText.split(/\n*---\n*/).map(s => s.trim()).filter(Boolean);
    if (samples.length === 0) { toast.error('Paste at least one article sample.'); return; }
    const fp = extractVoiceFingerprint(samples);
    if (fp.sampleWords < 200) {
      toast.warning(`Only ${fp.sampleWords} words analyzed — paste 3-5 articles (≥1000 words total) for an accurate voice.`);
    } else {
      toast.success(`Voice fingerprint extracted from ${fp.sampleWords} words.`);
    }
    setVoiceSamples(samples);
    setVoiceFingerprint(fp);
  };

  const clearVoice = () => {
    setVoiceFingerprint(null);
    setVoiceSamples([]);
    setSamplesText('');
    toast.success('Voice fingerprint cleared.');
  };

  return (
    <div className="space-y-6">
      {/* Author Library */}
      <Card className="p-6 space-y-4 bg-card/50 border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-400" />
              Author Library
            </h3>
            <p className="text-xs text-muted-foreground">Real bylines feed Person + Article JSON-LD (E-E-A-T)</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => startEdit()}>
            <Plus className="w-4 h-4 mr-1" /> New Author
          </Button>
        </div>

        {authors.length === 0 && !editing && (
          <p className="text-sm text-muted-foreground italic">No authors yet. Add at least one for proper E-E-A-T signals.</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {authors.map(a => (
            <div key={a.id} className={cn(
              "p-3 rounded-xl border bg-background/60 flex items-start gap-3",
              activeAuthorId === a.id ? 'border-emerald-500/40' : 'border-white/10',
            )}>
              <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-300 font-bold">
                {a.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold truncate">{a.name}</span>
                  {activeAuthorId === a.id && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                </div>
                {a.jobTitle && <div className="text-xs text-muted-foreground">{a.jobTitle}</div>}
                <div className="flex gap-1.5 mt-2">
                  <button onClick={() => setActiveAuthor(a.id)}
                          className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 hover:brightness-125">
                    {activeAuthorId === a.id ? 'Active' : 'Use'}
                  </button>
                  <button onClick={() => startEdit(a)}
                          className="text-[11px] px-2 py-0.5 rounded bg-muted text-foreground hover:brightness-125">Edit</button>
                  <button onClick={() => { removeAuthor(a.id); toast.success('Author removed'); }}
                          className="text-[11px] px-2 py-0.5 rounded bg-red-500/15 text-red-300 hover:brightness-125">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {editing && (
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
            <Input placeholder="Full name *" value={editing.name}
                   onChange={e => setEditing({ ...editing, name: e.target.value })} />
            <Input placeholder="Job title (e.g. Senior SEO Strategist)" value={editing.jobTitle || ''}
                   onChange={e => setEditing({ ...editing, jobTitle: e.target.value })} />
            <Textarea rows={2} placeholder="Short bio (1-2 sentences)" value={editing.bio}
                      onChange={e => setEditing({ ...editing, bio: e.target.value })} />
            <Input placeholder="Credentials (comma-separated, e.g. MBA, Google Ads Pro)"
                   value={editing.credentials.join(', ')}
                   onChange={e => setEditing({ ...editing, credentials: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
            <Input placeholder="Expertise areas (comma-separated)"
                   value={editing.expertiseAreas.join(', ')}
                   onChange={e => setEditing({ ...editing, expertiseAreas: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
            <Input placeholder="Headshot URL (optional)" value={editing.imageUrl || ''}
                   onChange={e => setEditing({ ...editing, imageUrl: e.target.value })} />
            <Input placeholder="LinkedIn URL" value={editing.social.find(s => s.platform === 'linkedin')?.url || ''}
                   onChange={e => {
                     const others = editing.social.filter(s => s.platform !== 'linkedin');
                     const url = e.target.value.trim();
                     setEditing({ ...editing, social: url ? [...others, { platform: 'linkedin', url }] : others });
                   }} />
            <Input placeholder="Twitter/X URL" value={editing.social.find(s => s.platform === 'twitter')?.url || ''}
                   onChange={e => {
                     const others = editing.social.filter(s => s.platform !== 'twitter');
                     const url = e.target.value.trim();
                     setEditing({ ...editing, social: url ? [...others, { platform: 'twitter', url }] : others });
                   }} />
            <div className="flex gap-2">
              <Button onClick={save} className="bg-emerald-600 hover:bg-emerald-500">Save author</Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Voice Fingerprint */}
      <Card className="p-6 space-y-4 bg-card/50 border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Brand Voice Fingerprint
            </h3>
            <p className="text-xs text-muted-foreground">
              Paste 3-5 of your best existing articles (separate with <code>---</code>). We extract sentence rhythm, em-dash rate, vocab richness — and inject it into the system prompt.
            </p>
          </div>
        </div>

        <Textarea
          rows={8}
          placeholder={`Paste article 1...\n\n---\n\nPaste article 2...\n\n---\n\nPaste article 3...`}
          value={samplesText}
          onChange={e => setSamplesText(e.target.value)}
        />

        <div className="flex gap-2">
          <Button onClick={analyzeVoice} className="bg-amber-600 hover:bg-amber-500">
            <Sparkles className="w-4 h-4 mr-1" /> Analyze voice
          </Button>
          {voiceFingerprint && (
            <Button variant="outline" onClick={clearVoice}>Clear</Button>
          )}
        </div>

        {voiceFingerprint && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
            <Stat label="Avg sentence" value={`${voiceFingerprint.avgSentenceLength}w`} />
            <Stat label="Burstiness" value={`±${voiceFingerprint.sentenceLengthStdDev}`} />
            <Stat label="Avg paragraph" value={`${voiceFingerprint.avgParagraphLength}w`} />
            <Stat label="Em-dashes/1k" value={`${voiceFingerprint.emDashRate}`} />
            <Stat label="Contractions/1k" value={`${voiceFingerprint.contractionRate}`} />
            <Stat label="Questions/1k" value={`${voiceFingerprint.questionRate}`} />
            <Stat label="1st-person/1k" value={`${voiceFingerprint.firstPersonRate}`} />
            <Stat label="Vocab richness" value={`${voiceFingerprint.vocabRichness}`} />
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded-lg bg-background/60 border border-white/10">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-bold font-mono text-foreground">{value}</div>
    </div>
  );
}
