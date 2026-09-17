"use client";

// shared:sign-in-buttons v2

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth/client";
import type { SocialProviderId } from "@/lib/auth/create-auth";

function GitHubIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-current">
      <path d="M12 .7a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.2.8-.6v-2.2c-3.4.7-4.1-1.4-4.1-1.4-.6-1.4-1.4-1.8-1.4-1.8-1.1-.8.1-.8.1-.8 1.3.1 2 1.3 2 1.3 1.1 2 3 1.4 3.7 1.1.1-.8.4-1.4.8-1.7-2.7-.3-5.5-1.4-5.5-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.6.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8-.8c1 0 2 .1 2.9.4 2.2-1.5 3.2-1.2 3.2-1.2.6 1.5.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.8 5.4-5.5 5.7.5.4.9 1.1.9 2.2v3.2c0 .4.2.7.8.6A11.5 11.5 0 0 0 12 .7Z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
      <path
        fill="#4285F4"
        d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.3h5.4a4.6 4.6 0 0 1-2 3v2.8h3.6c2.1-2 3.3-4.8 3.3-7.9Z"
      />
      <path
        fill="#34A853"
        d="M12 22c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1-3.7 1a5.6 5.6 0 0 1-5.3-3.8H3v2.9A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.7 13.7a6 6 0 0 1 0-3.7V7.1H3a10 10 0 0 0 0 9.5l3.7-2.9Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.1c1.6 0 3.1.6 4.2 1.7l3.2-3.2A10 10 0 0 0 3 7.1L6.7 10A5.6 5.6 0 0 1 12 6.1Z"
      />
    </svg>
  );
}

function LoadingIcon() {
  return (
    <span
      aria-hidden="true"
      className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

const PROVIDERS: Record<
  SocialProviderId,
  {
    icon: ReactNode;
    label: string;
    pendingLabel: string;
    variant: "default" | "outline";
    className: string;
  }
> = {
  github: {
    icon: <GitHubIcon />,
    label: "Continue with GitHub",
    pendingLabel: "Connecting to GitHub…",
    variant: "default",
    className: "h-12 w-full cursor-pointer rounded-xl text-sm shadow-sm",
  },
  google: {
    icon: <GoogleIcon />,
    label: "Continue with Google",
    pendingLabel: "Connecting to Google…",
    variant: "outline",
    className:
      "h-12 w-full cursor-pointer rounded-xl bg-white/70 text-sm shadow-sm hover:bg-white dark:bg-white/5 dark:hover:bg-white/10",
  },
};

export function SignInButtons({
  providers,
}: {
  providers: readonly SocialProviderId[];
}) {
  const [pendingProvider, setPendingProvider] =
    useState<SocialProviderId | null>(null);
  const [signInError, setSignInError] = useState<string | null>(null);

  async function handleSignIn(provider: SocialProviderId) {
    setPendingProvider(provider);
    setSignInError(null);

    try {
      const result = await signIn.social({
        provider,
        callbackURL: "/",
      });

      if (result.error) {
        setSignInError("Sign-in failed. Please try again.");
      }
    } catch {
      setSignInError("Sign-in failed. Please try again.");
    }

    // Avoid try/finally so React Compiler can optimize this handler.
    setPendingProvider(null);
  }

  if (providers.length === 0) {
    return (
      <p className="text-muted-foreground text-sm leading-6">
        Sign-in is temporarily unavailable. No identity provider is configured
        for this environment.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {providers.map((provider) => {
        const config = PROVIDERS[provider];
        const isPending = pendingProvider === provider;

        return (
          <Button
            key={provider}
            type="button"
            size="lg"
            variant={config.variant}
            className={config.className}
            disabled={pendingProvider !== null}
            onClick={() => handleSignIn(provider)}
          >
            {isPending ? <LoadingIcon /> : config.icon}
            {isPending ? config.pendingLabel : config.label}
          </Button>
        );
      })}
      <p
        className="text-muted-foreground mt-1 text-center text-xs"
        aria-live="polite"
      >
        {pendingProvider
          ? "A secure sign-in window is opening."
          : (signInError ?? "Secure sign-in. No password required.")}
      </p>
    </div>
  );
}
