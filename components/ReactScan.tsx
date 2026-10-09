"use client";

import { useEffect } from "react";

// Dev-only render profiler. The import() sits behind a build-time NODE_ENV
// check, so production bundles drop the branch (and react-scan with it), and
// at module level because React Compiler cannot lower import() inside a
// component. It must not live in a server component either: importing a
// client module from the server fails Next's instant-UI validation in dev.
const loadReactScan =
  process.env.NODE_ENV === "development" ? () => import("react-scan") : null;

export function ReactScan() {
  useEffect(() => {
    void loadReactScan?.().then(({ scan }) => scan({ enabled: true }));
  }, []);

  return null;
}
