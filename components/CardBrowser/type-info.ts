import type { EnergyType } from "@/lib/search/tags";

/** Label and official TCG Energy symbol (in `public/images/types/`) for each type. */
export const TYPE_INFO: Record<EnergyType, { label: string; icon: string }> = {
  grass: { label: "Grass", icon: "/images/types/grass.png" },
  fire: { label: "Fire", icon: "/images/types/fire.png" },
  water: { label: "Water", icon: "/images/types/water.png" },
  lightning: { label: "Lightning", icon: "/images/types/lightning.png" },
  psychic: { label: "Psychic", icon: "/images/types/psychic.png" },
  fighting: { label: "Fighting", icon: "/images/types/fighting.png" },
  darkness: { label: "Darkness", icon: "/images/types/darkness.png" },
  metal: { label: "Metal", icon: "/images/types/metal.png" },
  dragon: { label: "Dragon", icon: "/images/types/dragon.png" },
  colorless: { label: "Colorless", icon: "/images/types/colorless.png" },
};

export function isEnergyType(value: string): value is EnergyType {
  return Object.hasOwn(TYPE_INFO, value);
}

export function typeLabel(type: string): string {
  return isEnergyType(type) ? TYPE_INFO[type].label : type;
}
