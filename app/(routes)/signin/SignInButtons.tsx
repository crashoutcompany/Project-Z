"use client";

import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth-client";

export function SignInButtons() {
  const handleSignIn = async (provider: "github" | "google") => {
    await signIn.social({
      provider,
      callbackURL: "/",
    });
  };

  return (
    <div className="flex flex-col space-y-4">
      <Button
        type="button"
        className="focus-visible:bg-primary/90 cursor-pointer"
        onClick={() => handleSignIn("github")}
      >
        Sign in with Github
      </Button>
      <Button
        type="button"
        className="focus-visible:bg-primary/90 cursor-pointer"
        onClick={() => handleSignIn("google")}
      >
        Sign in with Google
      </Button>
    </div>
  );
}
