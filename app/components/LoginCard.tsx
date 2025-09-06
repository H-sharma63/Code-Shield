'use client';

import { signIn } from "next-auth/react";
import { GoogleLoginButton, GithubLoginButton } from "react-social-login-buttons";
import { X } from 'lucide-react';

interface LoginCardProps {
  onClose: () => void;
}

export default function LoginCard({ onClose }: LoginCardProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-cardPanel rounded-lg shadow-lg p-8 relative max-w-md w-full">
        <button onClick={onClose} className="absolute top-4 right-4 text-textSecondary hover:text-textPrimary">
          <X size={24} />
        </button>
        <h1 className="font-bold text-center text-2xl mb-5 text-textPrimary">User Login</h1>
        <div className="flex flex-col gap-4">
          <div className="w-3/4 mx-auto">
            <GoogleLoginButton style={{ borderRadius: '30px' }} onClick={() => signIn("google")} />
          </div>
          <div className="w-3/4 mx-auto">
            <GithubLoginButton style={{ borderRadius: '30px' }} onClick={() => signIn("github")} />
          </div>
        </div>
      </div>
    </div>
  );
}
