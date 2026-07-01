"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Rendered if the image fails to load (broken CDN, offline, etc.). */
  fallback?: React.ReactNode;
  fallbackClassName?: string;
  wrapperClassName?: string;
}

/**
 * An <img> that degrades gracefully to a brand gradient (or custom fallback)
 * if the remote source fails — so the UI is never broken by a dead image URL.
 */
export function SmartImage({
  src,
  alt = "",
  className,
  fallback,
  fallbackClassName,
  wrapperClassName,
  ...props
}: SmartImageProps) {
  const [failed, setFailed] = React.useState(false);

  if (failed || !src) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-electric/25 via-accent/15 to-pitch/25",
          fallbackClassName,
          className
        )}
        aria-label={alt}
      >
        {fallback}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
      {...props}
    />
  );
}
