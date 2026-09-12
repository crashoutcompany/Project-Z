import { SET_MAP } from "./lib/set-map";
import { deriveImageUrl } from "./lib/image-url";

async function main() {
  console.log("Testing Limitless CDN image HEAD requests for 1 card per set...");
  for (const setCode of Object.keys(SET_MAP)) {
    const url = deriveImageUrl(setCode, 1);
    const res = await fetch(url, { method: "HEAD" });
    console.log(`  ${setCode.padEnd(5)}: ${res.status} (${url})`);
    if (res.status !== 200) {
      throw new Error(`Failed to fetch image for ${setCode}: ${res.status}`);
    }
  }
  console.log("\n✅ All 23 set sample image URLs returned 200 OK!");
}

main().catch((err) => {
  console.error("❌ Image verification failed:", err);
  process.exit(1);
});
