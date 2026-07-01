import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/15 text-primary",
        secondary: "border-transparent bg-white/[0.06] text-foreground/80",
        outline: "border-white/15 text-foreground/80",
        live: "border-transparent bg-live/15 text-live",
        gold: "border-transparent bg-gold/15 text-gold",
        electric: "border-transparent bg-electric/15 text-electric",
        violet: "border-transparent bg-accent/15 text-accent",
        success: "border-transparent bg-pitch/15 text-pitch",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
