import { getRarityInfo } from "@/lib/rarity";
import type { SearchState } from "@/lib/search-history";
import { tagLabel } from "@/lib/search/tags";
import { typeLabel } from "./type-info";

type SetName = { id: number; setName: string };

/** A history row's two lines, e.g. "“pikachu”" over "Names · Grass · A1". */
export function describeSearch(
  state: SearchState,
  sets: SetName[],
): { title: string; detail: string } {
  const query = state.query.trim();
  const effects = state.mode === "effects";
  const parts = [effects ? "Effects" : "Names"];
  if (effects) parts.push(...state.tags.map(tagLabel));
  if (effects && state.tags.length > 1 && state.tagMode === "any") {
    parts.push("any tag");
  }
  parts.push(...state.types.map(typeLabel));
  parts.push(...state.rarities.map((r) => getRarityInfo(r).name));
  if (state.setIds.length === 1) {
    const name = sets.find((s) => s.id === state.setIds[0])?.setName;
    parts.push(name ?? "1 set");
  } else if (state.setIds.length > 1) {
    parts.push(`${state.setIds.length} sets`);
  }
  if (state.showDuplicates) parts.push("All prints");
  return {
    title: query ? `“${query}”` : "No search text",
    detail: parts.join(" · "),
  };
}
