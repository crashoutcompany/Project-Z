"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { encodeCardIdList } from "@/lib/trade";
import { publishTrade } from "@/server/trades";

export function PublishTradeForm({
  wantIds,
  giveIds,
}: {
  wantIds: number[];
  giveIds: number[];
}) {
  const [state, action, pending] = useActionState(publishTrade, null);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="want" value={encodeCardIdList(wantIds)} />
      <input type="hidden" name="give" value={encodeCardIdList(giveIds)} />
      {state?.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="active:scale-[0.97] motion-reduce:active:scale-100"
      >
        {pending ? "Publishing…" : "Publish listing"}
      </Button>
    </form>
  );
}
