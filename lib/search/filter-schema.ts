import { z } from "zod";
import { ALL_TAGS, ENERGY_TYPES } from "./tags";

const TagSchema = z.enum(ALL_TAGS);
const EnergyTypeSchema = z.enum(ENERGY_TYPES);

export const AttackFilterSchema = z.object({
  tags: z.array(TagSchema).optional(),
  energyCost: z.number().int().min(0).max(5).optional(),
  energyCostMin: z.number().int().min(0).max(5).optional(),
  energyCostMax: z.number().int().min(0).max(5).optional(),
  energyTypeCounts: z.record(z.string(), z.number().int().min(1)).optional(),
  damageMin: z.number().int().min(0).optional(),
  damageKind: z.enum(["FIXED", "PLUS", "SCALING"]).optional(),
});

export const EffectFilterSchema = z.object({
  kind: z.enum(["ABILITY", "TRAINER"]).optional(),
  tags: z.array(TagSchema).optional(),
});

export const FilterJSONSchema = z.object({
  surface: z.enum(["attack", "effect", "any"]).default("any"),
  attack: AttackFilterSchema.optional(),
  effect: EffectFilterSchema.optional(),
  anyOf: z
    .array(
      z.object({
        attack: AttackFilterSchema.optional(),
        effect: EffectFilterSchema.optional(),
      }),
    )
    .optional(),
  cardType: z.enum(["POKEMON", "TRAINER"]).optional(),
  trainerType: z.enum(["SUPPORTER", "ITEM", "TOOL", "STADIUM"]).optional(),
  energyType: z.array(EnergyTypeSchema).optional(),
  stage: z.array(z.enum(["BASIC", "STAGE1", "STAGE2"])).optional(),
  isEx: z.boolean().optional(),
  hpMin: z.number().int().min(0).optional(),
  setCodes: z.array(z.string()).optional(),
  textFallback: z.string().max(100).optional(),
});

export type AttackFilter = z.infer<typeof AttackFilterSchema>;
export type EffectFilter = z.infer<typeof EffectFilterSchema>;
export type FilterJSON = z.infer<typeof FilterJSONSchema>;

export const FILTER_JSON_SYSTEM_PROMPT = `You convert Pokémon TCG Pocket natural-language card queries into FilterJSON.

Return ONLY JSON matching this TypeScript type (no markdown):
{
  surface?: "attack" | "effect" | "any",
  attack?: {
    tags?: string[],
    energyCost?: number,
    energyCostMin?: number,
    energyCostMax?: number,
    energyTypeCounts?: Record<string, number>,
    damageMin?: number,
    damageKind?: "FIXED" | "PLUS" | "SCALING"
  },
  effect?: {
    kind?: "ABILITY" | "TRAINER",
    tags?: string[]
  },
  anyOf?: Array<{ attack?: AttackFilter; effect?: EffectFilter }>,
  cardType?: "POKEMON" | "TRAINER",
  trainerType?: "SUPPORTER" | "ITEM" | "TOOL" | "STADIUM",
  energyType?: string[],
  stage?: Array<"BASIC" | "STAGE1" | "STAGE2">,
  isEx?: boolean,
  hpMin?: number,
  setCodes?: string[],
  textFallback?: string
}

Allowed energyType values: ${ENERGY_TYPES.join(", ")}
Allowed tags: ${ALL_TAGS.join(", ")}

Rules:
- Prefer structured filters over textFallback.
- Attack-level conditions must describe ONE attack (tags + energyCost + damage together).
- Use anyOf only for true OR ("bench damage OR poison").
- "1 energy attack that does 50+" → attack.energyCost=1, attack.damageMin=50
- "coin flip" → attack.tags=["coin_flip"]
- "supporter that draws" → cardType=TRAINER, trainerType=SUPPORTER, effect.tags=["draw"]
- Ignore pack/set unless the user names a known set code`;
