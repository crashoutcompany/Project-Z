import { SET_MAP } from "./lib/set-map";
import { blobPathname, deriveImageUrl, listExistingCardImages } from "./lib/image-url";

function loadLocalEnv() {
  for (const file of [".env.local", ".env"] as const) {
    try {
      process.loadEnvFile(file);
    } catch {
      // optional
    }
  }
}

async function main() {
  loadLocalEnv();
  console.log("Testing Limitless source HEAD requests for 1 card per set...");
  for (const setCode of Object.keys(SET_MAP)) {
    const url = deriveImageUrl(setCode, 1);
    const res = await fetch(url, { method: "HEAD" });
    console.log(`  ${setCode.padEnd(5)}: ${res.status} (${url})`);
    if (res.status !== 200) {
      throw new Error(`Failed to fetch source image for ${setCode}: ${res.status}`);
    }
  }
  console.log("\n✅ All source sample image URLs returned 200 OK!");

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.log("Skipping Blob checks (BLOB_READ_WRITE_TOKEN not set).");
    return;
  }

  console.log("\nChecking Vercel Blob for 1 card per set...");
  const existing = await listExistingCardImages();
  for (const setCode of Object.keys(SET_MAP)) {
    const pathname = blobPathname(setCode, 1);
    const url = existing.get(pathname);
    console.log(`  ${setCode.padEnd(5)}: ${url ? "present" : "MISSING"} (${pathname})`);
  }
}

main().catch((err) => {
  console.error("❌ Image verification failed:", err);
  process.exit(1);
});
