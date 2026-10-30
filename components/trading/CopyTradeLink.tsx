"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildTradeUrl } from "@/lib/trade";

export function CopyTradeLink({ listingId }: { listingId: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const url = `${window.location.origin}${buildTradeUrl(listingId)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard write failed", err);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={copy}
      className="active:scale-[0.97] motion-reduce:active:scale-100"
    >
      {copied ? <Check /> : <Copy />}
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}
