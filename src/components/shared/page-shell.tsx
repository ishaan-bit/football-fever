import { cn } from "@/lib/utils";
import { SceneBackground } from "@/components/shared/scene-background";
import type { SceneName } from "@/lib/imagery";

export function PageShell({
  children,
  className,
  size = "default",
}: {
  children: React.ReactNode;
  className?: string;
  size?: "default" | "wide" | "narrow";
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 py-6 sm:px-6 sm:py-8",
        size === "wide" && "max-w-7xl",
        size === "default" && "max-w-6xl",
        size === "narrow" && "max-w-3xl",
        className
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  scene,
  seed,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** Renders a cinematic photographic banner behind the header. */
  scene?: SceneName;
  /** Keeps the scene pick stable for this page. Defaults to the page's title. */
  seed?: number | string;
}) {
  const content = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-electric">{eyebrow}</p>
        )}
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );

  if (!scene) return <div className="mb-6">{content}</div>;

  return (
    <div className="relative isolate mb-6 overflow-hidden rounded-3xl border border-white/[0.06] px-5 py-6 sm:px-7 sm:py-7">
      <SceneBackground scene={scene} seed={seed ?? (typeof title === "string" ? title : scene)} intensity="soft" from="left" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-electric/10 blur-3xl" />
      {content}
    </div>
  );
}
