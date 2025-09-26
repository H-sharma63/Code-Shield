'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import LoginCard from './components/LoginCard';

export default function Home() {
  const { data: session } = useSession();
  const user = session?.user;
  const [isLoginCardVisible, setIsLoginCardVisible] = useState(false); 

  useEffect(() => {
    if (user?.name && user?.email && session?.provider) {
      const logUserToSheet = async () => {
        try {
          const response = await fetch('/api/log-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: user.name, email: user.email, provider: session.provider }),
          });
          const data = await response.json();
          if (response.ok) {
            console.log('User logging successful:', data.message);
          } else {
            console.error('Failed to log user:', data.message);
          }
        } catch (error) {
          console.error('Network or unexpected error logging user:', error);
        }
      };
      logUserToSheet();
    }
  }, [session, user]); 

  return (
    <>
      <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 bg-basegradient">
        <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
          <div className="flex gap-4 items-center flex-col sm:flex-row">
            <button
              onClick={() => setIsLoginCardVisible(true)} 
              className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-primaryAccent text-white gap-2 hover:opacity-80 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            >
              Login
            </button>
            <a
              className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-primaryAccent text-white gap-2 hover:opacity-80 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
              href="/editor"
            >
              Editor
            </a>
          </div>
        </main>
      </div>
      {isLoginCardVisible && <LoginCard onClose={() => setIsLoginCardVisible(false)} />}
    </>
  );
}
