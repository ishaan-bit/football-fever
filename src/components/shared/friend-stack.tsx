"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn, initials, hslVar, hashSeed } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface Person {
  userId: string;
  name: string;
  avatar: string;
}

/** Brand accent tokens cycled per-avatar so a stack reads as a lively little crowd. */
const TINTS = ["--electric", "--accent", "--pitch", "--gold", "--live", "--magenta"] as const;

export function FriendStack({
  people,
  max = 5,
  size = "default",
  label,
  className,
}: {
  people: Person[];
  max?: number;
  size?: "sm" | "default";
  label?: string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const shown = people.slice(0, max);
  const extra = Math.max(0, people.length - max);
  const dim = size === "sm" ? "h-7 w-7 text-[9px]" : "h-9 w-9 text-[11px]";
  const dot = size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2";

  const spring = { type: "spring" as const, stiffness: 340, damping: 30 };

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex -space-x-2.5">
        {shown.map((p, i) => {
          const tint = TINTS[hashSeed(p.userId) % TINTS.length]!;
          // Deterministic per-user offsets keep SSR/CSR identical and stagger the breathing.
          const seed = hashSeed(p.userId);
          const online = seed % 5 !== 0; // stable, per-person "presence"
          const delay = (seed % 1000) / 1000;
          return (
            <motion.div
              key={p.userId}
              className="relative"
              style={{ zIndex: shown.length - i }}
              whileHover={{ y: -3, scale: 1.06, zIndex: 20 }}
              transition={spring}
            >
              {/* Soft breathing glow (subtle, gated) */}
              {!reduced && (
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-full"
                  style={{ boxShadow: `0 0 0 0 ${hslVar(`var(${tint})`, 0.35)}` }}
                  animate={{
                    boxShadow: [
                      `0 0 0 0 ${hslVar(`var(${tint})`, 0)}`,
                      `0 0 10px 1px ${hslVar(`var(${tint})`, 0.28)}`,
                      `0 0 0 0 ${hslVar(`var(${tint})`, 0)}`,
                    ],
                  }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: delay * 4 }}
                />
              )}
              <Avatar
                className={cn("ring-2 ring-background transition-shadow", dim)}
                style={{ boxShadow: `inset 0 0 0 1px ${hslVar(`var(${tint})`, 0.25)}` }}
              >
                <AvatarImage src={p.avatar} alt={p.name} />
                <AvatarFallback>{initials(p.name)}</AvatarFallback>
              </Avatar>
              {/* Online status dot with a gentle pulse ring */}
              {online && (
                <span className="absolute -bottom-0.5 -right-0.5 grid place-items-center">
                  {!reduced && (
                    <motion.span
                      aria-hidden
                      className={cn("absolute rounded-full", dot)}
                      style={{ backgroundColor: hslVar("var(--pitch)", 0.6) }}
                      animate={{ scale: [1, 2.1, 1], opacity: [0.55, 0, 0] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut", delay: delay * 2 }}
                    />
                  )}
                  <span
                    className={cn("relative rounded-full ring-2 ring-background", dot)}
                    style={{ backgroundColor: hslVar("var(--pitch)") }}
                  />
                </span>
              )}
            </motion.div>
          );
        })}
        {extra > 0 && (
          <motion.span
            className={cn(
              "relative grid place-items-center overflow-hidden rounded-full font-semibold ring-2 ring-background",
              dim
            )}
            style={{
              backgroundImage: `linear-gradient(135deg, ${hslVar("var(--electric)", 0.22)}, ${hslVar("var(--accent)", 0.22)})`,
            }}
            whileHover={{ y: -3, scale: 1.06 }}
            transition={spring}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={extra}
                initial={{ y: 8, opacity: 0, scale: 0.6 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -8, opacity: 0, scale: 0.6 }}
                transition={{ type: "spring", stiffness: 500, damping: 24 }}
                className="tabular-nums"
              >
                +{extra}
              </motion.span>
            </AnimatePresence>
          </motion.span>
        )}
      </div>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </div>
  );
}
