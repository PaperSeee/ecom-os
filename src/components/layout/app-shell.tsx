"use client";

import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";

interface AppShellProps {
  children: ReactNode;
}

export const AppShell = ({ children }: AppShellProps) => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative mx-auto flex w-full max-w-[1600px]">
        <Sidebar />
        <main className="w-full flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-8">
          <div className="space-y-6">
            {children}
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
};
