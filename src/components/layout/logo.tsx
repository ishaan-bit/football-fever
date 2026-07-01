import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("group flex items-center gap-2.5", className)} aria-label="Football Fever home">
      <span className="relative grid h-9 w-9 place-items-center">
        <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-electric via-accent to-pitch opacity-90 transition-transform group-hover:scale-105" />
        <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-electric via-accent to-pitch opacity-40 blur-md" />
        <svg viewBox="0 0 64 64" className="relative h-6 w-6">
          <circle cx="32" cy="32" r="17" stroke="#06070D" strokeWidth="3.5" fill="none" />
          <path d="M32 21l8 6-3 9h-10l-3-9 8-6z" fill="#06070D" />
        </svg>
      </span>
      {!compact && (
        <span className="font-display text-[15px] font-bold leading-none tracking-tight">
          Football<span className="text-gradient"> Fever</span>
        </span>
      )}
    </Link>
  );
}
