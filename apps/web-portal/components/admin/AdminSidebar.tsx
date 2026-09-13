/**
 * AdminSidebar – the real in-page navigation for /dashboard/admin.
 *
 * Section links are driven entirely by ADMIN_NAVIGATION_GROUPS in
 * lib/navigation.ts, the single source of truth also used elsewhere in the
 * app. This avoids a second, hand-maintained, hardcoded copy of the section
 * list drifting out of sync (the previous version of this file was never
 * rendered by the admin page and was missing "Credit Notes" as a result).
 */
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Crown, ChevronRight } from "lucide-react";
import { ADMIN_NAVIGATION_GROUPS } from "@/lib/navigation";

interface AdminSidebarProps {
  userName?: string;
}

function sectionFromHref(href: string): string {
  const query = href.split("?section=")[1];
  return query ?? "overview";
}

export function AdminSidebar({ userName }: AdminSidebarProps) {
  const searchParams = useSearchParams();
  const activeSection = searchParams.get("section") || "overview";

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col bg-emerald-900">
      {/* Identity */}
      <div className="border-b border-emerald-800/40 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-400">
            <Crown className="h-5 w-5 text-emerald-900" />
          </div>
          <div>
            <p className="text-sm font-bold leading-none text-white">Super Admin</p>
            {userName && (
              <p className="mt-0.5 text-[11px] text-emerald-300">{userName}</p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {ADMIN_NAVIGATION_GROUPS.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.pages.map(({ id, label, href, icon: Icon }) => {
                const active = activeSection === sectionFromHref(href);
                return (
                  <Link
                    key={id}
                    href={href}
                    scroll={false}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-emerald-600 text-white"
                        : "text-emerald-200 hover:bg-emerald-800/50 hover:text-white"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", active ? "text-white" : "text-emerald-400")} />
                    <span className="flex-1 text-left">{label}</span>
                    {active && <ChevronRight className="h-3.5 w-3.5 opacity-70" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-emerald-800/30 px-5 py-4">
        <p className="text-[10px] text-emerald-500">Zoho ERP · Admin Console</p>
      </div>
    </aside>
  );
}
