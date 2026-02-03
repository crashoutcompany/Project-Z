import { auth } from "@/lib/auth";
import { H1 } from "@/components/typography/headings";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignInButtons } from "./SignInButtons";

/**
 * Renders the sign-in page, redirecting authenticated users to the home page.
 *
 * Displays options for users to sign in using GitHub or Google. If the user is already authenticated, they are redirected to the root path.
 */
export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) redirect("/");

  return (
    <div className="m-10">
      <H1>Sign in Page</H1>
      <div className="text-center">
        In order to trade you must sign in with one of the following providers.
      </div>
      <div className="mx-auto mt-4 w-fit">
        <SignInButtons />
      </div>
    </div>
  );
}
