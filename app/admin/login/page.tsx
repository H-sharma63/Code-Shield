'use client'

import { useSession, signIn } from "next-auth/react"
import { GoogleLoginButton } from "react-social-login-buttons";
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from "react";

export default function AdminLoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  useEffect(() => {
    if (status === 'authenticated' && session?.provider === 'google-admin') {
      router.push('/admin/dashboard');
    }
  }, [session, status, router]);

  if (status === 'loading' || (status === 'authenticated' && session?.provider === 'google-admin')) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col justify-center sm:py-12">
      <div className="p-10 xs:p-0 mx-auto md:w-full md:max-w-md">
        <h1 className="font-bold text-center text-2xl mb-5 text-textPrimary">Admin Login</h1>
          <div className="px-5 py-7">
            {error && <p className="text-logoutButton text-center mb-4">{error}</p>}
            <div className="flex flex-col gap-4">
              {/* For admin login, we use providers with the '-admin' suffix */}
              <div className="w-[70%] mx-auto">
                <GoogleLoginButton style={{ borderRadius: '30px' }} onClick={() => signIn("google-admin", { callbackUrl: '/admin/dashboard' })} />
              </div>
            </div>
          </div>
      </div>
    </div>
  )
}