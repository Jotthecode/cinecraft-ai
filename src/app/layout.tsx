import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CineCraft AI — Full-Stack AI Storyboard Generator with Character Consistency",
  description: "Parse movie scripts using OpenAI LLMs and generate high-fidelity storyboard panels with FLUX.1 character consistency conditioning and natural language shot editing.",
  keywords: ["AI Storyboard Generator", "FLUX.1", "Character Consistency", "Shot Editing", "IP-Adapter", "Next.js 14", "Film Production"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full bg-slate-950 text-slate-100 antialiased">
      <body className={`${inter.className} min-h-full flex flex-col selection:bg-indigo-500 selection:text-white`}>
        {children}
      </body>
    </html>
  );
}
