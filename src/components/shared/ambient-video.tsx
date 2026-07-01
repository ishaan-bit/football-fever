"use client";
import * as React from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { SmartImage } from "./smart-image";
import { cn } from "@/lib/utils";

interface AmbientVideoProps {
  /** Direct .mp4 loop (Mixkit). */
  src: string;
  /** Poster image — painted first, and the graceful fallback if video is skipped. */
  poster: string;
  className?: string;
  /** Applied to both the <video> and the poster <img> (object-fit, opacity, etc.). */
  mediaClassName?: string;
  /** Disable the slow ken-burns drift on the poster fallback. */
  staticPoster?: boolean;
}

/**
 * A muted, looping, cover-fit background video that degrades gracefully:
 * - The poster image paints immediately (SSR-safe) and fades out only once the
 *   video can actually play, so first paint is instant and never blank.
 * - Video is skipped entirely under reduced-motion, Data Saver, or slow links
 *   (2g/slow-2g) — the ken-burns poster carries the cinematic feel instead.
 * - Any load/decode/autoplay failure falls back to the poster (and the poster,
 *   via SmartImage, to a brand gradient). It can never render broken.
 */
export function AmbientVideo({
  src,
  poster,
  className,
  mediaClassName,
  staticPoster,
}: AmbientVideoProps) {
  const reduced = useReducedMotion();
  const [allowVideo, setAllowVideo] = React.useState(false);
  const [playing, setPlaying] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  React.useEffect(() => {
    if (reduced) {
      setAllowVideo(false);
      return;
    }
    // Honour Data Saver and very slow connections — poster only.
    const c: { saveData?: boolean; effectiveType?: string } | undefined = (
      navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }
    ).connection;
    const constrained = !!c && (c.saveData === true || /2g/.test(c.effectiveType ?? ""));
    setAllowVideo(!constrained);
  }, [reduced]);

  const onCanPlay = () => {
    const v = videoRef.current;
    if (!v) return;
    // Autoplay may be deferred by the browser; nudge it, ignore rejection.
    void v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  const ken = !reduced && !staticPoster ? "animate-ken-burns" : "";

  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)} aria-hidden>
      <SmartImage
        src={poster}
        alt=""
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 will-change-transform",
          playing ? "opacity-0" : "opacity-100",
          ken,
          mediaClassName
        )}
      />
      {allowVideo && (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onCanPlay={onCanPlay}
          onError={() => setPlaying(false)}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-1000",
            playing ? "opacity-100" : "opacity-0",
            mediaClassName
          )}
        />
      )}
    </div>
  );
}
