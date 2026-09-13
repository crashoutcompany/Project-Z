import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { Prisma } from "@/prisma/generated/client/client";
import prisma from "@/prisma/db";
import {
  FILTER_JSON_SYSTEM_PROMPT,
  FilterJSONSchema,
  type FilterJSON,
} from "./filter-schema";
import { heuristicParse } from "./heuristic-parse";
import { hashQuery } from "./normalize-query";

export type ParseResult = {
  filter: FilterJSON;
  cached: boolean;
  source: "cache" | "llm" | "heuristic";
};

async function llmParse(normalized: string): Promise<FilterJSON> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY not set");

  const google = createGoogleGenerativeAI({ apiKey });
  const { object } = await generateObject({
    model: google("gemini-3.8-flash"),
    schema: FilterJSONSchema,
    system: FILTER_JSON_SYSTEM_PROMPT,
    prompt: normalized,
  });
  return object;
}

export async function parseQueryToFilter(
  normalized: string,
): Promise<ParseResult> {
  const queryHash = hashQuery(normalized);

  const cached = await prisma.searchQueryCache.findUnique({
    where: { queryHash },
  });

  if (cached) {
    const parsed = FilterJSONSchema.safeParse(cached.filterJson);
    if (parsed.success) {
      await prisma.searchQueryCache.update({
        where: { queryHash },
        data: { hitCount: { increment: 1 } },
      });
      return { filter: parsed.data, cached: true, source: "cache" };
    }
  }

  let filter: FilterJSON;
  let source: "llm" | "heuristic";

  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    try {
      filter = await llmParse(normalized);
      source = "llm";
    } catch {
      filter = heuristicParse(normalized);
      source = "heuristic";
    }
  } else {
    filter = heuristicParse(normalized);
    source = "heuristic";
  }

  filter = FilterJSONSchema.parse(filter);

  // Only persist LLM output. Caching the heuristic fallback would pin a
  // degraded parse to this query hash forever and never retry the LLM once
  // it recovers (or once an API key is configured).
  if (source === "llm") {
    await prisma.searchQueryCache.upsert({
      where: { queryHash },
      create: {
        queryHash,
        queryText: normalized,
        filterJson: filter as Prisma.InputJsonValue,
      },
      update: {
        filterJson: filter as Prisma.InputJsonValue,
        queryText: normalized,
        hitCount: { increment: 1 },
      },
    });
  }

  return { filter, cached: false, source };
}
