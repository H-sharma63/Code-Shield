'use client'

import { useSession, signIn, signOut } from "next-auth/react"
import { GoogleLoginButton, GithubLoginButton } from "react-social-login-buttons";

export default function UserLoginPage() {
  const { data: session } = useSession()

  if (session) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col justify-center sm:py-12">
        <div className="p-10 xs:p-0 mx-auto md:w-full md:max-w-md">
          <div className="bg-white shadow w-full rounded-lg divide-y divide-gray-200">
            <div className="px-5 py-7">
              <p className="text-center">Signed in as {session.user?.email}</p>
              <button
                onClick={() => signOut()}
                className="transition duration-200 mt-5 bg-red-500 hover:bg-red-600 focus:bg-red-700 focus:shadow-sm focus:ring-4 focus:ring-red-500 focus:ring-opacity-50 text-white w-full py-2.5 rounded-lg text-sm shadow-sm hover:shadow-md font-semibold text-center inline-block"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center sm:py-12">
      <div className="p-10 xs:p-0 mx-auto md:w-full md:max-w-md">
        <h1 className="font-bold text-center text-2xl mb-5">User Login</h1>
        <div className="bg-white shadow w-full rounded-lg divide-y divide-gray-200">
          <div className="px-5 py-7">
            <div className="flex flex-col gap-4">
              <GoogleLoginButton style={{ borderRadius: '30px' }} onClick={() => signIn("google")} />
              <GithubLoginButton style={{ borderRadius: '30px' }} onClick={() => signIn("github")} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
