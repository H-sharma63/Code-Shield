'use client';

import Link from 'next/link';
import Image from 'next/image';
import { User, Menu, X } from 'lucide-react';
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
      <nav className="w-full bg-cardPanel text-textPrimary p-4 flex justify-between items-center relative"> 
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Image src="/file.svg" alt="Logo" width={32} height={32} />
            <span className="text-xl font-bold">AI Code Reviewer</span>
          </Link>
        </div>
        <div className="md:hidden">
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-textPrimary focus:outline-none">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        <div className="hidden md:flex items-center space-x-4"> 
          {session ? (
            <>
              <Link href="/" className="hover:text-highlight">
                Home
              </Link>
              <Link href="/editor" className="hover:text-highlight">
                Projects
              </Link>
              <div className="relative" ref={dropdownRef}>
                <button onClick={() => setDropdownOpen(!dropdownOpen)} className="rounded-full">
                  {session.user?.image ? (
                    <Image
                      src={session.user.image}
                      alt="User Avatar"
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="rounded-full bg-gray-600 p-2 hover:bg-gray-500">
                      <User className="h-6 w-6" />
                    </div>
                  )}
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-cardPanel rounded-md shadow-lg py-1 z-10">
                    <Link href="/settings" className="block px-4 py-2 text-sm text-textPrimary hover:bg-gray-700">
                      Settings
                    </Link>
                    <button
                      onClick={() => signOut()}
                      className="block w-full text-left px-4 py-2 text-sm text-textPrimary hover:bg-logoutButton"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button onClick={() => setShowLoginModal(true)} className="hover:text-highlight">
              Login
            </button>
          )}
        </div>
      </nav>
      {isMobileMenuOpen && (
        <div className="md:hidden bg-cardPanel text-textPrimary p-4 flex flex-col items-center space-y-4">
          {session ? (
            <>
              <Link href="/" className="hover:text-highlight" onClick={() => setIsMobileMenuOpen(false)}>
                Home
              </Link>
              <Link href="/editor" className="hover:text-highlight" onClick={() => setIsMobileMenuOpen(false)}>
                Projects
              </Link>
              <button onClick={() => { setDropdownOpen(!dropdownOpen); setIsMobileMenuOpen(false); }} className="hover:text-highlight">
                {session.user?.name || 'Profile'}
              </button>
              <button onClick={() => { signOut(); setIsMobileMenuOpen(false); }} className="hover:text-highlight">
                Logout
              </button>
            </>
          ) : (
            <button onClick={() => { setShowLoginModal(true); setIsMobileMenuOpen(false); }} className="hover:text-highlight">
              Login
            </button>
          )}
        </div>
      )}
      {showLoginModal && <LoginCard onClose={() => setShowLoginModal(false)} />}
    </>
  );
};

export default Navbar;
