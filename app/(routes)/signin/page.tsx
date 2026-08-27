import { auth } from "@/lib/auth";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInButtons } from "./SignInButtons";

export const metadata: Metadata = {
  title: "Sign in | Pocket Trading",
  description:
    "Sign in to trade cards and manage your Pocket Trading collection.",
};

export const instant = false;

/**
 * Renders the sign-in page, redirecting authenticated users to the home page.
 *
 * Displays options for users to sign in using GitHub or Google. If the user is already authenticated, they are redirected to the root path.
 */
export default async function Page() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  if (session) redirect("/");

  return (
    <main className="relative isolate flex min-h-[calc(100svh-4rem)] items-center overflow-hidden bg-[#faf8f6] px-4 py-10 sm:px-6 lg:py-14 dark:bg-[#0c0b0d]">
      <div
        aria-hidden="true"
        className="absolute -top-40 left-1/2 -z-10 size-[34rem] -translate-x-1/2 rounded-full bg-red-200/50 blur-3xl dark:bg-red-950/25"
      />
      <div
        aria-hidden="true"
        className="absolute -right-32 -bottom-40 -z-10 size-[28rem] rounded-full bg-amber-100/70 blur-3xl dark:bg-amber-950/15"
      />

      <section className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-black/5 bg-white/80 shadow-[0_30px_100px_-35px_rgba(69,10,10,0.35)] backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr] dark:border-white/10 dark:bg-zinc-950/80">
        <div className="relative hidden min-h-[620px] overflow-hidden bg-gradient-to-br from-red-600 via-red-600 to-red-800 p-12 text-white lg:flex lg:flex-col">
          <div
            aria-hidden="true"
            className="absolute -top-20 -right-28 size-80 rounded-full border-[48px] border-white/10"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-28 -left-20 size-72 rounded-full border-[42px] border-black/10"
          />

          <Link
            href="/"
            className="relative z-10 flex w-fit items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold tracking-wide backdrop-blur-sm transition-colors hover:bg-white/15"
          >
            <span
              aria-hidden="true"
              className="relative block size-5 overflow-hidden rounded-full border-2 border-white"
            >
              <span className="absolute inset-x-0 top-[7px] h-0.5 bg-white" />
              <span className="absolute top-1/2 left-1/2 size-1.5 -translate-1/2 rounded-full border border-white bg-red-600" />
            </span>
            Pocket Trading
          </Link>

          <div className="relative z-10 mt-14 max-w-sm">
            <p className="mb-4 text-sm font-semibold tracking-[0.2em] text-red-100 uppercase">
              Made for collectors
            </p>
            <h2 className="text-4xl leading-[1.08] font-bold tracking-tight">
              Your next great trade starts here.
            </h2>
            <p className="mt-5 leading-7 text-red-50/80">
              Keep your collection organized, discover cards you love, and
              connect with collectors who are ready to trade.
            </p>
          </div>

          <div aria-hidden="true" className="relative z-10 mt-12 h-44">
            <div className="absolute top-4 left-5 h-36 w-24 -rotate-12 rounded-xl border border-white/20 bg-white/10 shadow-2xl backdrop-blur-sm" />
            <div className="absolute top-1 left-28 h-36 w-24 rotate-6 rounded-xl border border-white/25 bg-white/15 shadow-2xl backdrop-blur-sm" />
            <div className="absolute top-7 left-52 h-36 w-24 rotate-12 rounded-xl border border-white/20 bg-black/10 shadow-2xl backdrop-blur-sm" />
            <div className="absolute top-1/2 left-[10.5rem] grid size-20 -translate-y-1/2 place-items-center rounded-full border-[7px] border-white bg-red-500 shadow-xl">
              <span className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 bg-white" />
              <span className="relative size-7 rounded-full border-[5px] border-white bg-red-600" />
            </div>
          </div>

          <div className="relative z-10 mt-auto flex flex-wrap gap-2">
            {["Build your collection", "Find rare cards", "Trade securely"].map(
              (benefit) => (
                <span
                  key={benefit}
                  className="rounded-full border border-white/15 bg-black/10 px-3 py-1.5 text-xs font-medium text-red-50"
                >
                  {benefit}
                </span>
              ),
            )}
          </div>
        </div>

        <div className="flex min-h-[570px] flex-col p-6 sm:p-10 lg:min-h-0 lg:p-12">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-2 text-sm font-medium transition-colors"
          >
            <span aria-hidden="true">←</span>
            Back to home
          </Link>

          <div className="my-auto py-12">
            <div className="mb-8 lg:hidden">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-300">
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full bg-red-500"
                />
                Pocket Trading
              </div>
            </div>

            <p className="mb-3 text-sm font-semibold tracking-[0.18em] text-red-600 uppercase dark:text-red-400">
              Welcome back
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Sign in to your account
            </h1>
            <p className="text-muted-foreground mt-4 max-w-sm leading-7">
              Choose a provider to access your collection and continue trading.
            </p>

            <div className="from-border via-border my-8 h-px bg-gradient-to-r to-transparent" />

            <SignInButtons />
          </div>

          <p className="text-muted-foreground text-center text-xs leading-5 sm:text-left">
            By continuing, you confirm that you are authorized to use this
            account.
          </p>
        </div>
      </section>
    </main>
  );
}
