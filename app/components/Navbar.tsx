'use client';

import Link from 'next/link';
import Image from 'next/image';
import { User, Menu, X, Shield, ChevronDown, Power } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';
import LoginCard from './LoginCard';

const Navbar = () => {
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <>
      <nav className="w-full bg-[#060608]/80 backdrop-blur-xl border-b border-white/5 text-textPrimary px-6 py-3 flex justify-between items-center sticky top-0 z-50 transition-all duration-300"> 
        {/* Branding Area */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-3 group active:scale-95 transition-all">
            <div className="w-9 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center group-hover:border-primaryAccent/50 transition-colors">
              <Image src="/logo.svg" alt="Logo" width={20} height={20} className="brightness-125" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-white leading-none font-exo">CodeShield</span>
              <span className="text-[9px] font-mono text-white/30 tracking-[0.2em] uppercase mt-1">v2.0.4 // Mainframe</span>
            </div>
          </Link>
        </div>

        {/* Mobile Toggle */}
        <div className="md:hidden">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
            className="text-white/40 hover:text-white transition-colors p-2"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-1"> 
          {session ? (
            <>
              <Link href="/dashboard" className="px-5 py-2 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all font-exo">
                Dashboard
              </Link>
              <Link href="/projects" className="px-5 py-2 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all font-exo">
                Projects
              </Link>
              
              <div className="w-px h-4 bg-white/10 mx-2" />

              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setDropdownOpen(!dropdownOpen)} 
                  className="flex items-center gap-3 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all group"
                >
                  {session.user?.image ? (
                    <Image
                      src={session.user.image}
                      alt="User Avatar"
                      width={24}
                      height={24}
                      className="rounded-lg border border-white/10"
                    />
                  ) : (
                    <div className="w-6 h-6 bg-white/5 rounded-lg flex items-center justify-center border border-white/10">
                      <User className="h-4 w-4 text-white/40" />
                    </div>
                  )}
                  <span className="text-[10px] font-bold text-white/60 group-hover:text-white transition-colors uppercase tracking-widest font-exo">
                    {session.user?.name?.split(' ')[0]}
                  </span>
                  <ChevronDown size={14} className={`text-white/20 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-3 w-52 bg-[#0d0d10] border border-white/10 shadow-2xl rounded-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-4 py-2 border-b border-white/5 mb-2">
                       <p className="text-[9px] font-mono uppercase tracking-widest text-white/20">Session_Active</p>
                       <p className="text-xs font-bold text-white truncate font-exo">{session.user?.email}</p>
                    </div>
                    <Link href="/settings" className="flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/5 transition-all font-exo">
                      Settings
                    </Link>
                    <button
                      onClick={() => signOut()}
                      className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-red-400/60 hover:text-red-400 hover:bg-red-400/5 transition-all font-exo"
                    >
                      Terminate_Session
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button 
              onClick={() => setShowLoginModal(true)} 
              className="flex items-center gap-2 px-6 py-2.5 bg-white text-[#060608] text-[11px] font-bold uppercase tracking-[0.2em] rounded-xl hover:bg-white/90 active:scale-95 transition-all shadow-xl shadow-white/5 font-exo"
            >
              Initialize_Access <Power size={14} />
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Menu Overhaul */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-[#060608]/95 backdrop-blur-2xl p-8 flex flex-col items-center justify-center space-y-10 animate-in fade-in duration-300">
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute top-8 right-8 text-white/40 hover:text-white p-2 border border-white/10 rounded-full"
          >
            <X size={28} />
          </button>

          <div className="flex flex-col items-center gap-8 w-full">
            {session ? (
              <>
                <Link href="/dashboard" className="text-2xl font-bold text-white tracking-widest uppercase font-mono" onClick={() => setIsMobileMenuOpen(false)}>
                  Dashboard
                </Link>
                <Link href="/projects" className="text-2xl font-bold text-white tracking-widest uppercase font-mono" onClick={() => setIsMobileMenuOpen(false)}>
                  Projects
                </Link>
                <Link href="/settings" className="text-2xl font-bold text-white tracking-widest uppercase font-mono" onClick={() => setIsMobileMenuOpen(false)}>
                  Settings
                </Link>
                <button onClick={() => { signOut(); setIsMobileMenuOpen(false); }} className="text-2xl font-bold text-red-500 tracking-widest uppercase font-mono">
                  Log_Out
                </button>
              </>
            ) : (
              <button 
                onClick={() => { setShowLoginModal(true); setIsMobileMenuOpen(false); }} 
                className="px-10 py-5 bg-white text-[#060608] text-xl font-bold uppercase font-mono tracking-widest rounded-2xl shadow-2xl"
              >
                Access_Mainframe
              </button>
            )}
          </div>
        </div>
      )}
      {showLoginModal && <LoginCard onClose={() => setShowLoginModal(false)} />}
    </>
  );
};

export default Navbar;
