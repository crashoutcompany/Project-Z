import { NextResponse } from "next/server";
import prisma from "@/prisma/db";
import {
  PRINT_KEY_ATTACK_SELECT,
  PRINT_KEY_EFFECT_SELECT,
  printGroups,
} from "@/lib/search/dedupe";

const MAX_IDS = 40;

const PRINT_SELECT = {
  id: true,
  name: true,
  rarity: true,
  attacks: { select: PRINT_KEY_ATTACK_SELECT },
  effects: { select: PRINT_KEY_EFFECT_SELECT },
} as const;

/**
 * Every print (alt arts, reprints) of each requested card, keyed by card ID,
 * so the deck view can count an owned alt art as owning the deck's print.
 * The collection itself never leaves the browser; only deck card IDs come in.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const ids =
    typeof body === "object" &&
    body !== null &&
    "ids" in body &&
    Array.isArray((body as { ids: unknown }).ids)
      ? (body as { ids: unknown[] }).ids
      : null;

  if (
    !ids ||
    !ids.every((id): id is number => Number.isInteger(id) && Number(id) > 0)
  ) {
    return NextResponse.json(
      { error: "Missing positive integer[] field: ids" },
      { status: 400 },
    );
  }

  if (ids.length > MAX_IDS) {
    return NextResponse.json({ error: "Too many ids" }, { status: 400 });
  }

  if (ids.length === 0) {
    return NextResponse.json({ prints: {} });
  }

  try {
    const targets = await prisma.card.findMany({
      where: { id: { in: ids } },
      select: PRINT_SELECT,
    });
    const names = [...new Set(targets.map((card) => card.name))];
    const candidates = names.length
      ? await prisma.card.findMany({
          where: { name: { in: names, mode: "insensitive" } },
          select: PRINT_SELECT,
        })
      : [];
    return NextResponse.json({ prints: printGroups(targets, candidates) });
  } catch (err) {
    console.error("[api/cards/prints]", err);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
