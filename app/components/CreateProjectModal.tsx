'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Github, Lock, Globe, Shield } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
  const [repoName, setRepoName] = useState('');
  const [framework, setFramework] = useState<'blank' | 'nextjs' | 'vite-react' | 'node' | 'angular' | 'svelte' | 'python' | 'vanilla-vite'>('blank');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const allFrameworks = [
    { id: 'blank', name: 'Blank', icon: '📄', description: 'Just a README.md' },
    { id: 'nextjs', name: 'Next.js', icon: '▲', description: 'App Router, TS, Tailwind' },
    { id: 'vite-react', name: 'Vite + React', icon: '⚡', description: 'Fast React + TypeScript' },
    { id: 'angular', name: 'Angular', icon: '🅰️', description: 'Official Angular CLI' },
    { id: 'svelte', name: 'Svelte', icon: '🧡', description: 'SvelteKit via Vite' },
    { id: 'node', name: 'Node.js', icon: '🟢', description: 'Basic backend structure' },
    { id: 'python', name: 'Python', icon: '🐍', description: 'Flask / Basic Script' },
    { id: 'vanilla-vite', name: 'Vanilla Vite', icon: '🍦', description: 'Vite without framework' },
  ] as const;

  const handleCreateRepo = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/github/create-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: repoName.trim().replace(/\s+/g, '-').toLowerCase(),
          description,
          isPrivate,
          template: framework,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onClose();
        router.push(`/editor?repo=${data.repo.fullName}&template=${framework}`);
      } else {
        console.error('Repo creation failed:', data);
        setError(data.message || data.error || 'Failed to create repository');
      }
    } catch (err) {
      setError('An error occurred while creating the repository');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-exo overflow-y-auto">
      <div className="bg-[#0c0c0e] border border-white/10 p-5 rounded-3xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Github size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Create New Repo</h2>
            <p className="text-[8px] text-white/30 uppercase tracking-widest font-mono">Initialize on GitHub</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest px-1">Repository Name</label>
            <input
              type="text"
              autoFocus
              placeholder="e.g. my-awesome-app"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-2 text-sm text-white placeholder:text-white/10 focus:border-white/20 focus:ring-0 transition-all outline-none font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest px-1 flex justify-between items-center">
              Select Template
              <span className="text-[7px] text-white/20 font-mono italic">Scroll for more</span>
            </label>
            
            <div className="max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
              <div className="grid grid-cols-2 gap-2 pb-1">
                {allFrameworks.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFramework(f.id)}
                    className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${framework === f.id ? 'bg-white/10 border-white/30 ring-1 ring-white/20' : 'bg-white/[0.02] border-white/5 hover:bg-white/5'}`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-sm">{f.icon}</span>
                      {framework === f.id && <div className="w-1.5 h-1.5 rounded-full bg-primaryAccent shadow-[0_0_8px_#12c2e9]"></div>}
                    </div>
                    <span className="text-[10px] font-bold text-white mb-0.5">{f.name}</span>
                    <span className="text-[7px] text-white/30 leading-tight line-clamp-1">{f.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest px-1">Description (Optional)</label>
            <textarea
              placeholder="What's this project about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-2 text-[11px] text-white placeholder:text-white/10 focus:border-white/20 focus:ring-0 transition-all outline-none h-14 resize-none font-sans"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsPrivate(true)}
              className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl border transition-all ${isPrivate ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/5 text-white/30 hover:bg-white/5'}`}
            >
              <Lock size={12} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Private</span>
            </button>
            <button
              onClick={() => setIsPrivate(false)}
              className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl border transition-all ${!isPrivate ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/5 text-white/30 hover:bg-white/5'}`}
            >
              <Globe size={12} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Public</span>
            </button>
          </div>

          {error && (
            <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[9px] font-bold uppercase tracking-widest flex items-center gap-2">
              <Shield size={10} /> {error}
            </div>
          )}

          <div className="pt-1 flex flex-col gap-2">
            <button
              onClick={handleCreateRepo}
              disabled={!repoName || loading}
              className="w-full bg-white text-black font-black uppercase text-[10px] tracking-[0.15em] py-3.5 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.05)]"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>Create & Initialize Project</>
              )}
            </button>
            <button
              onClick={onClose}
              className="w-full py-1 text-[9px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-white/40 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

