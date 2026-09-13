import { NextResponse } from "next/server";
import prisma from "@/prisma/db";
import { parseCardRef } from "@/lib/deck-url";

/** Resolve deck URL refs (e.g. A1-94, P-A-12) to card payloads for the builder. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const refs =
    typeof body === "object" &&
    body !== null &&
    "refs" in body &&
    Array.isArray((body as { refs: unknown }).refs)
      ? (body as { refs: unknown[] }).refs.filter(
          (r): r is string => typeof r === "string",
        )
      : null;

  if (!refs) {
    return NextResponse.json(
      { error: "Missing string[] field: refs" },
      { status: 400 },
    );
  }

  if (refs.length > 40) {
    return NextResponse.json({ error: "Too many refs" }, { status: 400 });
  }

  // Malformed refs are a client error, not a lookup failure.
  let parsed: Array<{ ref: string; setCode: string; number: number }>;
  try {
    parsed = refs.map((ref) => {
      const { setCode, number } = parseCardRef(ref);
      return { ref, setCode, number };
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid card ref" },
      { status: 400 },
    );
  }

  if (parsed.length === 0) {
    return NextResponse.json({ cards: [] });
  }

  try {
    const cards = await prisma.card.findMany({
      where: {
        OR: parsed.map((p) => ({
          number: p.number,
          set: { code: p.setCode },
        })),
      },
      include: { set: { select: { code: true } } },
    });

    return NextResponse.json({
      cards: cards.map((c) => ({
        id: c.id,
        name: c.name,
        imageUrl: c.imageUrl,
        setCode: c.set.code,
        number: c.number,
        cardType: c.cardType,
        energyType: c.energyType,
        hp: c.hp,
        rarity: c.rarity,
        isEx: c.isEx,
        isTradeable: c.isTradeable,
        matchedTags: [] as string[],
      })),
    });
  } catch (err) {
    console.error("[api/cards/by-refs]", err);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
