'use client';

import React from 'react';
import { 
  ShieldCheck, 
  Zap, 
  Code2, 
  Cpu, 
  ChevronRight, 
  Github, 
  Lock, 
  Globe,
  Terminal as TerminalIcon,
  Shield,
  Activity,
  Layers,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#060608] text-textPrimary selection:bg-white/10 selection:text-white overflow-hidden">
      {/* Refined Background Layers with Visible but Subtle Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Top-center highlight */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_50%)]"></div>
        
        {/* Primary Accent Glow (Top Right) */}
        <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[80%] bg-primaryAccent/15 rounded-full blur-[120px]"></div>
        
        {/* Secondary Accent Wash (Bottom Left) - more towards the center-left */}
        <div className="absolute bottom-[-10%] left-[-10%] w-[80%] h-[80%] bg-secondaryAccent/10 rounded-full blur-[150px]"></div>

        {/* Extra highlight behind hero */}
        <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[60%] h-[40%] bg-primaryAccent/5 rounded-full blur-[100px]"></div>

        {/* Noise Texture */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] contrast-150"></div>
      </div>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="relative pt-12 pb-16 md:pt-20 md:pb-32 px-6">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-8 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <span className="text-xs font-medium tracking-tight text-white/60">New</span>
              <div className="h-3 w-px bg-white/10"></div>
              <span className="text-xs font-medium tracking-tight text-white/90">Autonomous Security Review v2.0</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-10 tracking-tight leading-[1.05] text-white">
              Secure your source code <br />
              <span className="text-textSecondary italic font-medium">with machine intelligence.</span>
            </h1>
            
            <p className="max-w-2xl mx-auto text-lg md:text-xl text-textSecondary mb-14 leading-relaxed font-medium">
              A high-performance security review platform designed for modern engineering teams. 
              Deploy AI-driven heuristic shields and eliminate vulnerabilities in real-time.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
              <Link 
                href="/dashboard" 
                className="group relative px-8 py-4 bg-white text-base font-semibold rounded-full overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-white/5"
              >
                <span className="relative flex items-center gap-2">
                  Get Started <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
              <button className="px-8 py-4 bg-white/5 border border-white/10 text-white font-semibold rounded-full backdrop-blur-md hover:bg-white/10 transition-all flex items-center gap-2">
                <Github size={18} /> View GitHub
              </button>
            </div>
          </div>

          {/* Minimal Code Preview */}
          <div className="mt-32 max-w-4xl mx-auto relative px-4">
             <div className="absolute -inset-10 bg-white/5 blur-[120px] rounded-full opacity-50"></div>
             <div className="relative bg-[#16161a] border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                   <div className="flex space-x-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-white/10"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-white/10"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-white/10"></div>
                   </div>
                   <div className="text-[10px] font-mono tracking-widest text-white/30 uppercase">Audit_Engine_Terminal</div>
                   <div className="w-10"></div>
                </div>
                <div className="p-8 font-mono text-sm leading-relaxed text-white/80">
                   <div className="flex gap-4 opacity-40">
                      <span className="select-none text-right w-4">1</span>
                      <p><span className="text-white/40">#</span> Initializing security protocol...</p>
                   </div>
                   <div className="flex gap-4">
                      <span className="select-none text-right w-4 opacity-40">2</span>
                      <p><span className="text-white">import</span> <span className="text-white/60">shield</span></p>
                   </div>
                   <div className="flex gap-4 bg-white/5 -mx-8 px-8 border-l-2 border-white/50">
                      <span className="select-none text-right w-4 opacity-40">3</span>
                      <p className="pl-4">results = shield.<span className="text-white">analyze</span>(current_context)</p>
                   </div>
                   <div className="flex gap-4">
                      <span className="select-none text-right w-4 opacity-40">4</span>
                      <p className="pl-4 text-green-400/80">✓ 0 Critical Vulnerabilities Found</p>
                   </div>
                </div>
             </div>
          </div>
        </section>

        {/* Feature Section: Clean Minimalist */}
        <section className="py-32 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="group">
                <div className="w-10 h-10 border border-white/10 rounded-lg flex items-center justify-center mb-6 group-hover:border-white/30 transition-colors">
                  <Shield size={20} className="text-white/60" />
                </div>
                <h3 className="text-lg font-semibold mb-3 text-white">Neural Auditing</h3>
                <p className="text-sm text-textSecondary leading-relaxed">
                  Deep structural analysis using machine intelligence to expose hidden logic flaws and security anti-patterns.
                </p>
              </div>

              <div className="group">
                <div className="w-10 h-10 border border-white/10 rounded-lg flex items-center justify-center mb-6 group-hover:border-white/30 transition-colors">
                  <Activity size={20} className="text-white/60" />
                </div>
                <h3 className="text-lg font-semibold mb-3 text-white">Real-time Telemetry</h3>
                <p className="text-sm text-textSecondary leading-relaxed">
                  Instant feedback loop with secure execution sandboxes. Monitor performance and security as you write.
                </p>
              </div>

              <div className="group">
                <div className="w-10 h-10 border border-white/10 rounded-lg flex items-center justify-center mb-6 group-hover:border-white/30 transition-colors">
                  <Layers size={20} className="text-white/60" />
                </div>
                <h3 className="text-lg font-semibold mb-3 text-white">Multi-Language Kernel</h3>
                <p className="text-sm text-textSecondary leading-relaxed">
                  Support for polyglot projects across the entire modern syntax spectrum. One platform for every stack.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Minimal CTA */}
        <section className="py-40 px-6 border-t border-white/5">
           <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-10 tracking-tight">Deploy with confidence.</h2>
              <p className="text-lg text-textSecondary mb-14 max-w-xl mx-auto">
                 Join thousands of developers using CodeShield to build more secure software, faster.
              </p>
              <Link 
                href="/dashboard" 
                className="inline-flex items-center gap-3 px-10 py-5 bg-white text-base font-bold rounded-full hover:scale-105 transition-all shadow-xl shadow-white/5"
              >
                Launch Dashboard <ChevronRight size={20} />
              </Link>
           </div>
        </section>

        {/* Tech Footer */}
        <footer className="py-10 px-6 bg-base/50 border-t border-white/5">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="flex items-center space-x-3">
              <Image src="/logo.svg" alt="Logo" width={24} height={24} />
              <span className="text-lg font-bold tracking-tight text-white/90">CodeShield</span>
            </div>
            
            <div className="flex flex-wrap justify-center gap-8 text-xs font-medium text-white/40 uppercase tracking-widest">
              <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-white transition-colors">Terms</Link>
              <Link href="#" className="hover:text-white transition-colors">Docs</Link>
              <Link href="#" className="hover:text-white transition-colors">Status</Link>
            </div>

            <div className="text-xs font-medium text-white/20 tracking-widest">
              © 2026 CODESHIELD AI
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
