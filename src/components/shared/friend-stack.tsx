import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn, initials } from "@/lib/utils";

interface Person {
  userId: string;
  name: string;
  avatar: string;
}

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
  const shown = people.slice(0, max);
  const extra = Math.max(0, people.length - max);
  const dim = size === "sm" ? "h-7 w-7 text-[9px]" : "h-9 w-9 text-[11px]";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex -space-x-2.5">
        {shown.map((p) => (
          <Avatar key={p.userId} className={cn("ring-2 ring-background", dim)}>
            <AvatarImage src={p.avatar} alt={p.name} />
            <AvatarFallback>{initials(p.name)}</AvatarFallback>
          </Avatar>
        ))}
        {extra > 0 && (
          <span className={cn("grid place-items-center rounded-full bg-white/10 font-semibold ring-2 ring-background", dim)}>
            +{extra}
          </span>
        )}
      </div>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </div>
  );
}
