export type E2EEnvironment = {
  EXPOSE_TESTING_API?: string;
  VERCEL?: string;
  VERCEL_ENV?: string;
};

export function isTestingApiExposed(
  env: E2EEnvironment = {
    EXPOSE_TESTING_API: process.env.EXPOSE_TESTING_API,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
  },
): boolean {
  if (env.EXPOSE_TESTING_API !== "1") return false;
  // Off Vercel (local / CI / Cloud Agent) is allowed; on Vercel, preview only.
  return env.VERCEL !== "1" || env.VERCEL_ENV === "preview";
}
