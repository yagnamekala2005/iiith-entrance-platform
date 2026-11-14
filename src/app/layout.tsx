import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppBackHandler } from "@/components/navigation/app-back-handler";

export const metadata: Metadata = {
  title: "IIITH Entrance Preparation",
  description: "Focused preparation for IIITH UGEE and SPEC.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased overflow-x-hidden">
      <body className="min-h-full flex flex-col overflow-x-hidden w-full max-w-full relative font-sans">
        <AppBackHandler />
        {children}
      </body>
    </html>
  );
}
