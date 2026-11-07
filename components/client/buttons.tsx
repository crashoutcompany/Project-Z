"use client";

import { useTransition } from "react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { updateAuthStatus } from "@/server/actions";
import { useSession } from "@/lib/auth/client";

/** `hasSession` is server-provided; never pass the session object (it carries the token). */
export const AuthButton = ({
  hasSession,
  hideOnSmallScreens: hide = false,
}: {
  hasSession: boolean;
  hideOnSmallScreens?: boolean;
}) => {
  const [isPending, startTransition] = useTransition();
  const session = useSession();
  // The layout's server-rendered answer goes stale: a session that expires
  // or ends in another tab would still offer "Sign Out". So does the client's
  // cached one after a server-side sign out. Offer it only while both agree.
  const signedIn = hasSession && (session.isPending || Boolean(session.data));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => await updateAuthStatus());
      }}
    >
      <Button
        type="submit"
        disabled={isPending}
        className={cn(
          "w-full cursor-pointer",
          hide ? "hidden sm:block" : "md:hidden",
        )}
        variant="ghost"
      >
        {signedIn ? "Sign Out" : "Sign In"}
      </Button>
    </form>
  );
};
