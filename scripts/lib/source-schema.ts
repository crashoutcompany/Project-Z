import { z } from "zod";

export const SourceAttackSchema = z.object({
  name: z.string(),
  cost: z.array(z.string()),
  damage: z.string(),
  effect: z.string().optional().nullable(),
});

export const SourceAbilitySchema = z.object({
  name: z.string(),
  effect: z.string(),
});

export const SourceCardSchema = z.object({
  expansion: z.string(),
  card_id: z.string(),
  image: z.string(),
  hp: z.number().optional().nullable(),
  energy: z.string().optional().nullable(),
  name: z.string(),
  card_type: z.string(),
  evolution_type: z.string(),
  attacks: z.array(SourceAttackSchema).default([]),
  ability: SourceAbilitySchema.optional().nullable(),
  weakness: z.string().optional().nullable(),
  retreat: z.number().optional().nullable(),
  rarity: z.string(),
  ex: z.boolean(),
  baby: z.boolean(),
  pack: z.string().optional().nullable(),
  alternate_versions: z.array(z.union([z.number(), z.string()])).optional(),
  artist: z.string().optional().nullable(),
  internal_id: z.union([z.number(), z.string()]).optional().nullable(),
});

export const SourcePayloadSchema = z.array(SourceCardSchema);

export type SourceAttack = z.infer<typeof SourceAttackSchema>;
export type SourceAbility = z.infer<typeof SourceAbilitySchema>;
export type SourceCard = z.infer<typeof SourceCardSchema>;
