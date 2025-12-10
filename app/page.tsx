'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';


export default function Home() {
  const { data: session } = useSession();
  const user = session?.user;

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
      <div className="min-h-screen bg-basegradient text-white">
        
        <main className="flex flex-col items-center justify-center p-4 sm:p-8 lg:p-16 gap-8 lg:gap-16">
          <div className="flex flex-col lg:flex-row items-center justify-between w-full max-w-6xl">
            {/* Left Section: Text Content */}
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left mb-8 lg:mb-0 lg:w-1/2">
              <h1 className="text-5xl sm:text-6xl font-bold leading-tight mb-4">
                AI Based <span className="text-blue-500">Code</span> Reviewer
                <br />
                and Debugger
              </h1>
              <p className="text-lg sm:text-xl text-gray-300 mb-8">
                Transform your development workflow with intelligent code
                analysis, real-time feedback, and secure multi-language execution.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center">
                  Get Started <span className="ml-2">→</span>
                </button>
                {/* <button className="border border-white text-white font-semibold py-3 px-6 rounded-lg hover:bg-white hover:text-blue-600 transition-colors duration-300">
                  See Live Demo
                </button> */}
              </div>
            </div>

            {/* Right Section: Image/Code Snippets */}
            <div className="lg:w-1/2 flex flex-col gap-4 justify-center lg:justify-end">
<div className="bg-gray-800 rounded-lg shadow-lg w-full max-w-xl overflow-hidden">
                <div className="flex items-center p-3 border-b border-gray-700">
                  <div className="flex space-x-1.5">
                    <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                    <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  </div>
                  <span className="text-sm text-gray-300 ml-3">Protractor Test</span>
                  <span className="text-sm text-gray-500 ml-auto">login-test.js</span>
                </div>
                <pre className="text-sm text-gray-200 p-4 overflow-auto">
                  <code>
{`describe('Login Test', () => {
  it('should login', () => {
    browser.get('/login');
    element(by.id('email')).sendKeys('test@example.com');
    element(by.id('password')).sendKeys('password123');
    element(by.buttonText('Login')).click();
    expect(element(by.css('.welcome'))).getText().toBe('Welcome!');
  });
});`}
                  </code>
                </pre>
              </div>

              {/* Playwright Code Snippet */}
              <div className="bg-gray-800 rounded-lg shadow-lg w-full max-w-xl overflow-hidden">
                <div className="flex items-center p-3 border-b border-gray-700">
                  <div className="flex space-x-1.5">
                    <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                    <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  </div>
                  <span className="text-sm text-gray-300 ml-3">Playwright Test (Converted)</span>
                  <span className="text-sm text-gray-500 ml-auto">login-test.spec.ts</span>
                  <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full ml-2">Auto-Generated</span>
                </div>
                <pre className="text-sm text-gray-200 p-4 overflow-auto">
                  <code>
{`import { test, expect } from '@playwright/test';
test('Login Test', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#email', 'test@example.com');
  await page.fill('#password', 'password123');
  await page.click('button:has-text("Login")');
  await expect(page.locator('.welcome')).toHaveText('Welcome!');
});`}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
