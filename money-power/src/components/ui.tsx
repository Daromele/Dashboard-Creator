"use client";

import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

export function Card({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx("mp-card p-5 sm:p-6", className)}>
      {(title || action) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-lg font-semibold">{title}</h2>}
            {description && <p className="mt-1 max-w-2xl text-sm text-body/80">{description}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

const TONES = {
  blush: "bg-blush",
  rose: "bg-rose",
  sage: "bg-sage",
  cream: "bg-cream",
  white: "bg-white",
} as const;

export function KpiCard({
  label,
  value,
  hint,
  tone = "white",
  emphasis = false,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: keyof typeof TONES;
  emphasis?: boolean;
}) {
  return (
    <div
      className={clsx(
        "mp-card p-5",
        TONES[tone],
        // Coloured KPI headers use dark charcoal text for accessible contrast.
        "text-charcoal",
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-charcoal/70">{label}</p>
      <p
        className={clsx(
          "numeric mt-2 font-semibold",
          emphasis ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-2 text-sm text-charcoal/70">{hint}</p>}
    </div>
  );
}

export function Metric({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.06em] text-body/70">{label}</p>
      <p className="numeric mt-1 text-lg font-semibold text-charcoal">{value}</p>
      {hint && <p className="mt-1 text-xs text-body/70">{hint}</p>}
    </div>
  );
}

const BADGE_TONES = {
  cut: "bg-cut-bg text-cut-text",
  watch: "bg-watch-bg text-watch-text",
  calm: "bg-sage/40 text-sage-deep",
  neutral: "bg-cream text-charcoal",
  gold: "bg-gold/20 text-[#7a5f2f]",
} as const;

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof BADGE_TONES;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2.5 text-sm",
        variant === "primary" && "bg-charcoal text-white hover:bg-body",
        variant === "secondary" && "border border-line bg-white text-charcoal hover:bg-blush",
        variant === "ghost" && "text-body hover:bg-blush hover:text-charcoal",
        variant === "danger" && "bg-cut-bg text-cut-text hover:bg-[#f7d7d3]",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={clsx("block", className)}>
      <span className="mp-label">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-body/70">{hint}</span>}
      {error && (
        <span role="alert" className="mt-1 block text-xs font-semibold text-cut-text">
          {error}
        </span>
      )}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx("mp-input", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={clsx("mp-input", className)} {...props}>
      {children}
    </select>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-blush/50 p-8 text-center">
      <p className="font-semibold text-charcoal">{title}</p>
      {children && <div className="mt-2 text-sm text-body/80">{children}</div>}
    </div>
  );
}

export function Callout({
  tone = "neutral",
  title,
  children,
}: {
  tone?: "neutral" | "warning" | "danger" | "good";
  title?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "rounded-xl border p-4 text-sm",
        tone === "neutral" && "border-line bg-cream text-charcoal",
        tone === "warning" && "border-[#e2cfa5] bg-watch-bg text-watch-text",
        tone === "danger" && "border-[#efc4bf] bg-cut-bg text-cut-text",
        tone === "good" && "border-sage bg-sage/25 text-sage-deep",
      )}
      role={tone === "danger" ? "alert" : undefined}
    >
      {title && <p className="font-semibold">{title}</p>}
      <div className={clsx(title && "mt-1")}>{children}</div>
    </div>
  );
}

export function TableShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0", className)}>
      <table className="mp-stack-table w-full min-w-full border-collapse text-sm md:min-w-[42rem]">
        {children}
      </table>
    </div>
  );
}

export function Th({ children, align = "left" }: { children: ReactNode; align?: "left" | "right" }) {
  return (
    <th
      scope="col"
      className={clsx(
        "whitespace-nowrap bg-charcoal px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.06em] text-white first:rounded-l-lg last:rounded-r-lg",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  label,
  align = "left",
  className,
}: {
  children?: ReactNode;
  label: string;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <td
      data-label={label}
      className={clsx(
        "border-b border-line px-3 py-3 align-middle md:border-b",
        align === "right" ? "md:text-right" : "",
        className,
      )}
    >
      {children}
    </td>
  );
}
