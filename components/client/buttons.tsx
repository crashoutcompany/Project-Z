"use client";

import { Session } from "@/lib/auth";
import { useTransition } from "react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { updateAuthStatus } from "@/server/actions";

export const AuthButton = ({
  session,
  hideOnSmallScreens: hide = false,
}: {
  session: Session | null;
  hideOnSmallScreens?: boolean;
}) => {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => await updateAuthStatus(session));
      }}
    >
      <Button
        type="submit"
        disabled={isPending}
        className={cn(
          "w-full cursor-pointer",
          hide ? "hidden sm:block" : "sm:hidden",
        )}
        variant="ghost"
      >
        {session ? "Sign Out" : "Sign In"}
      </Button>
    </form>
  );
};
