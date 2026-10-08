"use client";

import { useTransition } from "react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { updateAuthStatus } from "@/server/actions";

/** `hasSession` is server-provided; never pass the session object (it carries the token). */
export const AuthButton = ({
  hasSession,
  hideOnSmallScreens: hide = false,
}: {
  hasSession: boolean;
  hideOnSmallScreens?: boolean;
}) => {
  const [isPending, startTransition] = useTransition();

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
          hide ? "hidden sm:block" : "sm:hidden",
        )}
        variant="ghost"
      >
        {hasSession ? "Sign Out" : "Sign In"}
      </Button>
    </form>
  );
};
