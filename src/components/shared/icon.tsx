import {
  Home, CalendarDays, Sparkles, Target, Gamepad2, TrendingUp, Trophy,
  Volume2, Zap, Crosshair, Flame, Goal, Laugh, Brain, Clock, Scale, Ghost,
  Swords, Eye, Moon, CalendarCheck, Gauge, Activity, PlayCircle, ScanSearch,
  Coffee, Flag, UserPlus, Timer, Newspaper, Award, Hash, Shield, Bell,
  Users, MessageCircle, Mic, Video, Star, Crown, ChevronRight, Circle,
  type LucideIcon,
} from "lucide-react";

const REGISTRY: Record<string, LucideIcon> = {
  Home, CalendarDays, Sparkles, Target, Gamepad2, TrendingUp, Trophy,
  Volume2, Zap, Crosshair, Flame, Goal, Laugh, Brain, Clock, Scale, Ghost,
  Swords, Eye, Moon, CalendarCheck, Gauge, Activity, PlayCircle, ScanSearch,
  Coffee, Flag, UserPlus, Timer, Newspaper, Award, Hash, Shield, Bell,
  Users, MessageCircle, Mic, Video, Star, Crown, ChevronRight,
};

interface IconProps {
  name: string;
  className?: string;
  size?: number;
}

/** Render a lucide icon by its string name (used by data-driven UI). */
export function Icon({ name, className, size }: IconProps) {
  const Cmp = REGISTRY[name] ?? Circle;
  return <Cmp className={className} size={size} />;
}
