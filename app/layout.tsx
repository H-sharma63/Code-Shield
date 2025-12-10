import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import PusherProvider from "./components/PusherProvider";
import { ProjectProvider } from "./components/ProjectContext";
import ConditionalNavbar from "./components/ConditionalNavbar";
import Script from "next/script";

export const metadata: Metadata = {
  title: "CodeShield",
  description: "CodeShield: AI based code reviewer and debugger",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
      </head>
      <body className="font-exo antialiased bg-base overflow-x-hidden">
        <Providers>
          <PusherProvider>
            <ProjectProvider>
              <ConditionalNavbar />
              {children}
            </ProjectProvider>
          </PusherProvider>
        </Providers>
      </body>
    </html>
  );
}