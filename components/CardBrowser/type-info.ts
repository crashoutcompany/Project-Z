import {
  Anvil,
  BicepsFlexed,
  Droplet,
  Eye,
  Flame,
  Leaf,
  Moon,
  Sparkle,
  Star,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { EnergyType } from "@/lib/search/tags";

/** Label, glyph and Energy-symbol colours for each Pokémon type. */
export const TYPE_INFO: Record<
  EnergyType,
  { label: string; icon: LucideIcon; className: string }
> = {
  grass: { label: "Grass", icon: Leaf, className: "bg-green-600 text-white" },
  fire: { label: "Fire", icon: Flame, className: "bg-red-600 text-white" },
  water: { label: "Water", icon: Droplet, className: "bg-sky-500 text-white" },
  lightning: {
    label: "Lightning",
    icon: Zap,
    className: "bg-yellow-400 text-yellow-950",
  },
  psychic: { label: "Psychic", icon: Eye, className: "bg-purple-600 text-white" },
  fighting: {
    label: "Fighting",
    icon: BicepsFlexed,
    className: "bg-orange-700 text-white",
  },
  darkness: {
    label: "Darkness",
    icon: Moon,
    className: "bg-slate-800 text-white dark:ring-1 dark:ring-white/25",
  },
  metal: { label: "Metal", icon: Anvil, className: "bg-zinc-400 text-zinc-950" },
  dragon: {
    label: "Dragon",
    icon: Sparkle,
    className: "bg-amber-600 text-white",
  },
  colorless: {
    label: "Colorless",
    icon: Star,
    className: "bg-stone-200 text-stone-800",
  },
};

export function isEnergyType(value: string): value is EnergyType {
  return Object.hasOwn(TYPE_INFO, value);
}

export function typeLabel(type: string): string {
  return isEnergyType(type) ? TYPE_INFO[type].label : type;
}
