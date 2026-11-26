"use client";

import { useId, useState } from "react";
import {
  exportCollection,
  parseCollectionImport,
  validateCollection,
  type Collection,
} from "@/lib/collection";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Copy } from "lucide-react";

type Status = { kind: "success" | "error"; message: string } | null;

function plural(count: number, word: string): string {
  return `${count.toLocaleString()} ${word}${count === 1 ? "" : "s"}`;
}

/**
 * Copy/paste backup for the browser-only collection. Export shows the stored
 * JSON to copy; import merges pasted JSON into what is already stored.
 */
export function CollectionTransfer({
  collection,
  knownIds,
  onImport,
}: {
  collection: Collection;
  knownIds: Set<number>;
  onImport: (incoming: Collection) => void;
}) {
  const [open, setOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importStatus, setImportStatus] = useState<Status>(null);
  const [copyStatus, setCopyStatus] = useState<Status>(null);
  const exportId = useId();
  const importId = useId();
  const panelId = useId();

  const exportText = exportCollection(collection);
  const ownedCount = Object.keys(collection).length;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(exportText);
      setCopyStatus({ kind: "success", message: "Copied." });
    } catch {
      setCopyStatus({
        kind: "error",
        message: "Couldn't copy. Select the text and copy it yourself.",
      });
    }
  }

  function handleImport() {
    const result = parseCollectionImport(importText);
    if (!result.ok) {
      setImportStatus({ kind: "error", message: result.error });
      return;
    }
    const known = validateCollection(result.collection, knownIds);
    const count = Object.keys(known).length;
    const skipped =
      result.skipped + Object.keys(result.collection).length - count;
    if (count === 0) {
      setImportStatus({
        kind: "error",
        message: "None of those cards are in the catalog.",
      });
      return;
    }
    onImport(known);
    setImportText("");
    setImportStatus({
      kind: "success",
      message:
        `Merged ${plural(count, "card")} into your collection.` +
        (skipped > 0
          ? ` Skipped ${skipped.toLocaleString()} ${skipped === 1 ? "entry" : "entries"} that didn't match a card.`
          : ""),
    });
  }

  return (
    <section
      data-testid="collection-transfer"
      className="bg-card ring-foreground/10 rounded-2xl shadow-xs ring-1"
    >
      <div className="flex items-center justify-between gap-4 p-4">
        <div className="min-w-0">
          <h2 className="font-semibold">Export / import</h2>
          <p className="text-muted-foreground text-sm">
            Your collection is saved in this browser. Copy it to back it up or
            move it, and paste it back in to restore.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
          className="shrink-0 gap-1"
        >
          {open ? (
            <>
              Hide <ChevronUp className="size-4" />
            </>
          ) : (
            <>
              Show <ChevronDown className="size-4" />
            </>
          )}
        </Button>
      </div>

      {open ? (
        <div
          id={panelId}
          className="grid gap-6 border-t p-4 md:grid-cols-2 md:gap-4"
        >
          <div className="space-y-2">
            <label htmlFor={exportId} className="text-sm font-medium">
              Export ({plural(ownedCount, "card")})
            </label>
            <Textarea
              id={exportId}
              data-testid="collection-export"
              readOnly
              value={exportText}
              onFocus={(e) => e.currentTarget.select()}
              className="max-h-48 min-h-24 font-mono text-xs break-all md:text-xs"
            />
            <div className="flex items-center gap-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCopy}
                className="gap-1"
              >
                <Copy className="size-4" /> Copy
              </Button>
              <StatusText status={copyStatus} />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor={importId} className="text-sm font-medium">
              Import
            </label>
            <Textarea
              id={importId}
              data-testid="collection-import"
              value={importText}
              onChange={(e) => {
                setImportText(e.target.value);
                setImportStatus(null);
              }}
              placeholder='{"12": 1, "40": 2}'
              aria-invalid={importStatus?.kind === "error" || undefined}
              className="max-h-48 min-h-24 font-mono text-xs break-all md:text-xs"
            />
            <div className="flex items-center gap-3">
              <Button
                type="button"
                size="sm"
                onClick={handleImport}
                disabled={!importText.trim()}
              >
                Import and merge
              </Button>
              <StatusText
                status={importStatus}
                testId="collection-import-status"
              />
            </div>
            <p className="text-muted-foreground text-xs">
              Cards you already have keep the larger quantity. Nothing is
              removed.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function StatusText({ status, testId }: { status: Status; testId?: string }) {
  return (
    <p
      role="status"
      data-testid={testId}
      className={cn(
        "text-sm",
        status?.kind === "error"
          ? "text-destructive"
          : "text-emerald-600 dark:text-emerald-400",
      )}
    >
      {status?.message}
    </p>
  );
}
