export interface SetInfo {
  code: string;
  name: string;
  releaseDate?: string; // ISO date string if known
}

export const SET_MAP: Record<string, SetInfo> = {
  A1: { code: "A1", name: "Genetic Apex", releaseDate: "2024-10-30" },
  A1a: { code: "A1a", name: "Mythical Island", releaseDate: "2024-12-17" },
  A2: { code: "A2", name: "Space-Time Smackdown", releaseDate: "2025-01-30" },
  A2a: { code: "A2a", name: "Triumphant Light", releaseDate: "2025-02-28" },
  A2b: { code: "A2b", name: "Shining Revelry", releaseDate: "2025-03-27" },
  A3: { code: "A3", name: "Celestial Guardians", releaseDate: "2025-04-30" },
  A3a: { code: "A3a", name: "Extradimensional Crisis", releaseDate: "2025-05-29" },
  A3b: { code: "A3b", name: "Eevee Grove", releaseDate: "2025-06-26" },
  A4: { code: "A4", name: "Wisdom of Sea and Sky", releaseDate: "2025-07-30" },
  A4a: { code: "A4a", name: "Secluded Springs", releaseDate: "2025-08-28" },
  A4b: { code: "A4b", name: "Deluxe Pack: ex", releaseDate: "2025-09-25" },
  B1: { code: "B1", name: "Mega Rising", releaseDate: "2025-10-30" },
  B1a: { code: "B1a", name: "Crimson Blaze", releaseDate: "2025-11-27" },
  B2: { code: "B2", name: "Fantastical Parade", releaseDate: "2025-12-18" },
  B2a: { code: "B2a", name: "Paldean Wonders", releaseDate: "2026-01-29" },
  B2b: { code: "B2b", name: "Mega Shine", releaseDate: "2026-02-26" },
  B3: { code: "B3", name: "Pulsing Aura", releaseDate: "2026-03-26" },
  B3a: { code: "B3a", name: "Paradox Drive", releaseDate: "2026-04-30" },
  B3b: { code: "B3b", name: "Everyday Wonders", releaseDate: "2026-05-28" },
  B4: { code: "B4", name: "Ruler of the Skies", releaseDate: "2026-06-25" },
  B4a: { code: "B4a", name: "Team Rocket's Ambition", releaseDate: "2026-07-30" },
  "P-A": { code: "P-A", name: "Promo-A", releaseDate: "2024-10-30" },
  "P-B": { code: "P-B", name: "Promo-B", releaseDate: "2025-10-30" },
};

export function getSetInfo(code: string): SetInfo {
  const info = SET_MAP[code];
  if (!info) {
    throw new Error(`Unknown set code: "${code}". Cannot import card under an unmapped set.`);
  }
  return info;
}

const CARD_ID_RE = /^([A-Za-z0-9]+(?:-[A-Za-z]+)?)-(\d{1,3})$/;

export function parseCardId(cardId: string): { setCode: string; number: number } {
  const match = cardId.match(CARD_ID_RE);
  if (!match) {
    throw new Error(`Invalid card_id format: "${cardId}". Expected format like "A1-1" or "P-A-12".`);
  }
  return {
    setCode: match[1],
    number: parseInt(match[2], 10),
  };
}
