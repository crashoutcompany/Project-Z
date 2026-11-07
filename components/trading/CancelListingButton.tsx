"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { cancelTrade } from "@/server/trades";

export function CancelListingButton({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState(cancelTrade, null);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="listingId" value={listingId} />
      <Button
        type="submit"
        variant="destructive"
        size="sm"
        disabled={pending}
        className="active:scale-[0.97] motion-reduce:active:scale-100"
      >
        {pending ? "Cancelling…" : "Cancel listing"}
      </Button>
      {state?.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
