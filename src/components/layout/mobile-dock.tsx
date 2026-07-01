"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { DOCK } from "@/lib/constants";
import { Icon } from "@/components/shared/icon";
import { cn } from "@/lib/utils";

export function MobileDock() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="fixed inset-x-0 z-40 lg:hidden bottom-[calc(2.25rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto mb-2 max-w-md px-3">
        <div className="glass-strong flex items-center justify-around rounded-full px-1.5 py-1.5 shadow-elevated">
          {DOCK.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-tour={"nav-" + (item.href === "/" ? "home" : item.href.slice(1))}
                className="relative flex flex-1 flex-col items-center gap-0.5 rounded-full px-2 py-2"
              >
                {active && (
                  <motion.span
                    layoutId="dock-active"
                    className="absolute inset-0 rounded-2xl bg-white/[0.09] ring-1 ring-white/10"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon
                  name={item.icon}
                  className={cn(
                    "relative h-5 w-5 transition-colors",
                    active ? "text-electric" : "text-muted-foreground"
                  )}
                />
                <span
                  className={cn(
                    "relative text-[10px] font-medium transition-colors",
                    active ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
