"use client";
import { motion } from "framer-motion";
import { MapPin, Users2, CalendarDays } from "lucide-react";
import type { Venue } from "@/types";
import { SmartImage } from "@/components/shared/smart-image";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/** A host-stadium card with cover image, capacity, and match count. */
export function VenueCard({
  venue,
  matchCount,
  index = 0,
}: {
  venue: Venue;
  matchCount: number;
  index?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.04, 0.3), ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduce ? undefined : { y: -4 }}
      className="group overflow-hidden rounded-3xl border border-white/[0.06] glass"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <SmartImage
          src={venue.image}
          alt={venue.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
          <MapPin className="h-3 w-3" />
          {venue.city}, {venue.country}
        </div>
        {matchCount > 0 && (
          <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-electric/20 px-2.5 py-1 text-[11px] font-semibold text-electric backdrop-blur">
            <CalendarDays className="h-3 w-3" />
            {matchCount} {matchCount === 1 ? "match" : "matches"}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 p-3.5">
          <h3 className="font-display text-base font-bold leading-tight tracking-tight text-white">
            {venue.name}
          </h3>
          {venue.fifaName && venue.fifaName !== venue.name && (
            <p className="text-[11px] text-white/70">FIFA: {venue.fifaName}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-3.5 py-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users2 className="h-3.5 w-3.5" />
          <span className="tabular font-semibold text-foreground/90">
            {venue.capacity.toLocaleString("en-US")}
          </span>
          capacity
        </span>
        {venue.surface && (
          <span className="rounded-full bg-pitch/10 px-2 py-0.5 text-[10px] font-medium text-pitch">
            {venue.surface}
          </span>
        )}
      </div>
    </motion.div>
  );
}
