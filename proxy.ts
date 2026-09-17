import { auth } from "@/lib/auth";
import { SIGN_IN_PATH } from "@/lib/auth/config";
import { createAuthProxy } from "@/lib/auth/proxy";

export default createAuthProxy({
  auth,
  publicPaths: ["/", SIGN_IN_PATH],
  rules: [{ path: "*", access: "session" }],
  signInPath: SIGN_IN_PATH,
});

export const config = {
  matcher: ["/((?!api(?:/|$)|_next(?:/|$)|favicon\\.ico$|images(?:/|$)).*)"],
};
