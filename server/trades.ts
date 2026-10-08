"use server";

import { auth } from "@/lib/auth";
import {
  buildTradeUrl,
  createListingId,
  listingExpiresAt,
  parseCardIdList,
  tradeIdentifier,
  toProvider,
} from "@/lib/trade";
import prisma from "@/prisma/db";
import { TradeStatus } from "@/prisma/generated/client/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

const publishSchema = z.object({
  want: z.string().min(1, "Pick at least one card you want."),
  give: z.string().min(1, "Pick at least one card you’re giving."),
});

const cancelSchema = z.object({
  listingId: z.string().min(1),
});

type ActionState = { error: string } | null;

async function requireSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id || !session.user.email) {
    redirect("/signin");
  }
  return session;
}

async function sessionTradeIdentity(userId: string, email: string) {
  const account = await prisma.account.findFirst({
    where: { userId },
    select: { providerId: true },
  });
  return {
    identifier: tradeIdentifier(email, account?.providerId),
    provider: toProvider(account?.providerId),
  };
}

export async function publishTrade(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  const parsed = publishSchema.safeParse({
    want: formData.get("want"),
    give: formData.get("give"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid trade." };
  }

  let wantIds: number[];
  let giveIds: number[];
  try {
    wantIds = parseCardIdList(parsed.data.want);
    giveIds = parseCardIdList(parsed.data.give);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid card list." };
  }

  if (wantIds.length === 0) {
    return { error: "Pick at least one card you want." };
  }
  if (giveIds.length === 0) {
    return { error: "Pick at least one card you’re giving." };
  }

  const uniqueIds = [...new Set([...wantIds, ...giveIds])];
  const cards = await prisma.card.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, isTradeable: true },
  });

  if (cards.length !== uniqueIds.length) {
    return { error: "One or more cards could not be found." };
  }
  if (cards.some((card) => !card.isTradeable)) {
    return { error: "Every card in a listing must be tradeable." };
  }

  let identity: { identifier: string; provider: ReturnType<typeof toProvider> };
  try {
    identity = await sessionTradeIdentity(session.user.id, session.user.email);
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Could not resolve your account.",
    };
  }

  const listingId = createListingId();
  const expiresAt = listingExpiresAt();
  const connect = (ids: number[]) => ({
    connect: ids.map((id) => ({ id })),
  });

  await prisma.$transaction([
    prisma.trade.create({
      data: {
        tradeCreationId: `${listingId}-w`,
        listingId,
        playerId: session.user.id,
        identifier: identity.identifier,
        provider: identity.provider,
        isSeeking: true,
        status: TradeStatus.ACTIVE,
        expiresAt,
        cards: connect(wantIds),
      },
    }),
    prisma.trade.create({
      data: {
        tradeCreationId: `${listingId}-g`,
        listingId,
        playerId: session.user.id,
        identifier: identity.identifier,
        provider: identity.provider,
        isSeeking: false,
        status: TradeStatus.ACTIVE,
        expiresAt,
        cards: connect(giveIds),
      },
    }),
  ]);

  redirect(buildTradeUrl(listingId));
}

export async function cancelTrade(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  const parsed = cancelSchema.safeParse({
    listingId: formData.get("listingId"),
  });
  if (!parsed.success) {
    return { error: "Missing listing." };
  }

  let identity: { identifier: string };
  try {
    identity = await sessionTradeIdentity(session.user.id, session.user.email);
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Could not resolve your account.",
    };
  }

  const result = await prisma.trade.updateMany({
    where: {
      listingId: parsed.data.listingId,
      identifier: identity.identifier,
      status: TradeStatus.ACTIVE,
    },
    data: { status: TradeStatus.CANCELLED },
  });

  if (result.count === 0) {
    return { error: "You can only cancel your own active listing." };
  }

  redirect(buildTradeUrl(parsed.data.listingId));
}
