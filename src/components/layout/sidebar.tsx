"use client";

import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";
import { Boxes, ChartNoAxesCombined, ChevronsLeft, ChevronsRight, Flag, Gauge, Radar, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/launchpad", label: "LaunchPad", icon: Flag },
  { href: "/product-lab", label: "Product Lab", icon: Boxes },
  { href: "/competitors", label: "Spy Tracker", icon: Radar },
  { href: "/ads-scaling", label: "Ads & Scaling", icon: ChartNoAxesCombined },
  { href: "/financial-tracker", label: "Financial Tracker", icon: Wallet },
];

export const Sidebar = () => {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 border-r border-white/10 bg-slate-950/75 p-3 backdrop-blur-xl lg:flex lg:flex-col",
        sidebarCollapsed ? "w-[86px]" : "w-[270px]",
      )}
    >
      <div className="mb-5 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/70 px-2 py-3">
        <div className={cn("overflow-hidden transition-all", sidebarCollapsed ? "w-0" : "w-auto")}>
          <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">E-COM-OS</p>
          <p className="text-sm text-slate-400">Operating Cockpit</p>
        </div>
        <button
          type="button"
          onClick={toggleSidebar}
          className="rounded-lg border border-white/15 bg-slate-950 p-2 text-slate-300 hover:text-white"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                isActive
                  ? "fin-chip text-emerald-100"
                  : "text-slate-300 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className={cn("truncate", sidebarCollapsed ? "hidden" : "inline")}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
