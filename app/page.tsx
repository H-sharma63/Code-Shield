'use client'; // This directive is needed for client-side components in Next.js App Router

import Image from "next/image";
import { useEffect } from 'react';
import { useSession } from 'next-auth/react'; // Import useSession

export default function Home() {
  const { data: session } = useSession(); // Get session data
  const user = session?.user; // Extract user from session

  useEffect(() => {


    // Only attempt to log the user if we have their data and they are logged in
    if (user?.name && user?.email && session?.provider) { // Added session?.provider check
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
            // You might want to show a success message to the user or redirect
          } else {
            console.error('Failed to log user:', data.message);
            // Handle errors, e.g., show an error message
          }
        } catch (error) {
          console.error('Network or unexpected error logging user:', error);
          // Handle network errors
        }
      };

      logUserToSheet();
    }
  }, [session]); // Re-run effect when session changes

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            href="/login"
          >
            Login
          </a>
        </div>
      </main>

    </div>
  );
}
