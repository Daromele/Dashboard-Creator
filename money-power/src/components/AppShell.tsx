"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addMonths, formatMonthLabel, type MonthKey } from "@/lib/dates";
import { apiRequest } from "@/lib/client";
import { clsx } from "@/lib/clsx";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/bills", label: "Recurring Bills" },
  { href: "/paychecks", label: "Paycheck Plan" },
  { href: "/budget", label: "Monthly Budget" },
  { href: "/cut-list", label: "Cut List" },
  { href: "/withholding", label: "Withholding" },
  { href: "/categories", label: "Categories & Lists" },
  { href: "/setup", label: "Setup" },
  { href: "/help", label: "Help" },
];

export function AppShell({
  clientName,
  selectedMonth,
  children,
}: {
  clientName: string;
  selectedMonth: MonthKey;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  async function changeMonth(month: MonthKey) {
    await apiRequest("/api/settings", { method: "PATCH", body: { selectedMonth: month } });
    startTransition(() => router.refresh());
  }

  async function signOut() {
    await apiRequest("/api/auth/signout", { method: "POST" });
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <div className="min-h-screen lg:flex">
      <aside className="bg-charcoal text-white lg:min-h-screen lg:w-64 lg:shrink-0">
        <div className="flex items-center justify-between px-5 py-4 lg:block">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gold font-bold text-charcoal">
              M
            </span>
            <span className="text-lg font-semibold text-white">Money Power</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="main-nav"
            className="rounded-lg border border-white/25 px-3 py-1.5 text-sm lg:hidden"
          >
            Menu
          </button>
        </div>

        <nav
          id="main-nav"
          className={clsx("px-3 pb-5 lg:block lg:pt-2", open ? "block" : "hidden")}
        >
          <ul className="space-y-1">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      "block rounded-lg px-3 py-2 text-sm transition",
                      active ? "bg-white/15 font-semibold text-white" : "text-white/75 hover:bg-white/10",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={signOut}
            className="mt-4 w-full rounded-lg px-3 py-2 text-left text-sm text-white/60 hover:bg-white/10"
          >
            Sign out
          </button>
        </nav>
      </aside>

      <div className="flex-1">
        <header className="border-b border-line bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
            <p className="text-sm text-body">
              Hello, <span className="font-semibold text-charcoal">{clientName}</span> ·{" "}
              <span className="text-charcoal">{formatMonthLabel(selectedMonth)}</span> dashboard
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => changeMonth(addMonths(selectedMonth, -1))}
                className="rounded-full border border-line px-3 py-1.5 text-sm hover:bg-blush"
              >
                ‹
              </button>
              <input
                type="month"
                value={selectedMonth}
                aria-label="Selected month"
                onChange={(event) => {
                  if (event.target.value) void changeMonth(event.target.value);
                }}
                className="rounded-full border border-line px-3 py-1.5 text-sm"
              />
              <button
                type="button"
                aria-label="Next month"
                onClick={() => changeMonth(addMonths(selectedMonth, 1))}
                className="rounded-full border border-line px-3 py-1.5 text-sm hover:bg-blush"
              >
                ›
              </button>
            </div>
          </div>
        </header>

        <main
          className={clsx(
            "mx-auto max-w-6xl px-5 py-6 sm:px-8 sm:py-8",
            pending && "opacity-60 transition-opacity",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
