"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, ChartNoAxesCombined, Flag, Gauge, Radar, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", icon: Gauge, label: "Dashboard" },
  { href: "/launchpad", icon: Flag, label: "Launch" },
  { href: "/product-lab", icon: Boxes, label: "Lab" },
  { href: "/competitors", icon: Radar, label: "Spy" },
  { href: "/ads-scaling", icon: ChartNoAxesCombined, label: "Ads" },
  { href: "/financial-tracker", icon: Wallet, label: "Cash" },
];

export const MobileNav = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-950/95 px-2 pb-safe pt-2 backdrop-blur lg:hidden">
      <ul className="grid grid-cols-6 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-md px-2 py-1.5 text-[10px]",
                  active ? "text-cyan-300" : "text-slate-400",
                )}
                aria-label={item.label}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
