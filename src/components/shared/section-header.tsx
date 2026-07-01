import { cn } from "@/lib/utils";

export function SectionHeader({
  title,
  icon,
  action,
  className,
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
        {icon}
        {title}
      </h2>
      {action}
    </div>
  );
}
