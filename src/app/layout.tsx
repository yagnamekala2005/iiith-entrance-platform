import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AntiScreenshotShield } from "@/components/security/anti-screenshot-shield";
import { AppBackHandler } from "@/components/navigation/app-back-handler";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IIITH Entrance Preparation",
  description: "Focused preparation for IIITH UGEE and SPEC.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased overflow-x-hidden`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden w-full max-w-full relative">
        <AntiScreenshotShield />
        <AppBackHandler />
        {children}
      </body>
    </html>
  );
}
