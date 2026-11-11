"use client";

import { useId, useRef, useState } from "react";
import { Bookmark, Check, Clock, Pencil, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  MAX_NAME_LENGTH,
  searchKey,
  type SearchHistory,
  type SearchState,
} from "@/lib/search-history";
import { describeSearch } from "./describe-search";

const row =
  "hover:bg-accent focus-visible:bg-accent flex min-w-0 flex-1 items-start gap-2.5 rounded-md px-2 py-1.5 text-left outline-none pointer-coarse:py-2.5";

const iconButton =
  "text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:ring-ring/50 inline-flex size-8 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-[3px] pointer-coarse:size-10";

type SearchHistoryPanelProps = {
  history: SearchHistory;
  sets: { id: number; setName: string }[];
  onRun: (state: SearchState) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onClearRecents: () => void;
};

function Summary({
  state,
  sets,
  name,
}: {
  state: SearchState;
  sets: SearchHistoryPanelProps["sets"];
  name?: string;
}) {
  const { title, detail } = describeSearch(state, sets);
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-medium">
        {name ?? title}
      </span>
      <span className="text-muted-foreground block truncate text-xs">
        {name ? `${title} · ${detail}` : detail}
      </span>
    </span>
  );
}

function RenameField({
  initial,
  onDone,
}: {
  initial: string;
  onDone: (name: string | null) => void;
}) {
  const [draft, setDraft] = useState(initial);
  return (
    <form
      className="flex min-w-0 flex-1 items-center gap-1 px-1 py-1"
      onSubmit={(e) => {
        e.preventDefault();
        onDone(draft);
      }}
    >
      <Input
        autoFocus
        aria-label="Search name"
        value={draft}
        maxLength={MAX_NAME_LENGTH}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Escape") return;
          // Leave the rename, not the dropdown.
          e.stopPropagation();
          onDone(null);
        }}
        className="h-8"
      />
      <button type="submit" className={iconButton} aria-label="Save name">
        <Check className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        className={iconButton}
        aria-label="Cancel rename"
        onClick={() => onDone(null)}
      >
        <X className="size-4" aria-hidden />
      </button>
    </form>
  );
}

/** The SearchBox dropdown: saved searches, then the last few searches. */
export function SearchHistoryPanel({
  history,
  sets,
  onRun,
  onRename,
  onDelete,
  onClearRecents,
}: SearchHistoryPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  // The entry to focus once its rename field closes, so focus (and the
  // dropdown) stays put.
  const refocusId = useRef<string | null>(null);
  const { saved, recents } = history;
  const id = useId();

  return (
    <div className="space-y-2 p-1.5">
      {saved.length ? (
        <section aria-labelledby={`${id}-saved`}>
          <h3
            id={`${id}-saved`}
            className="text-muted-foreground px-2 pt-1 pb-1 text-xs font-medium"
          >
            Saved
          </h3>
          <ul className="space-y-0.5">
            {saved.map((entry) => (
              <li key={entry.id} className="flex items-center gap-0.5">
                {editingId === entry.id ? (
                  <RenameField
                    initial={entry.name}
                    onDone={(name) => {
                      if (name !== null) onRename(entry.id, name);
                      refocusId.current = entry.id;
                      setEditingId(null);
                    }}
                  />
                ) : (
                  <>
                    <button
                      ref={(el) => {
                        if (el && refocusId.current === entry.id) {
                          refocusId.current = null;
                          el.focus();
                        }
                      }}
                      type="button"
                      data-history-item
                      className={row}
                      onClick={() => onRun(entry.state)}
                    >
                      <Bookmark
                        className="text-primary mt-0.5 size-4 shrink-0"
                        aria-hidden
                      />
                      <Summary
                        state={entry.state}
                        sets={sets}
                        name={entry.name}
                      />
                    </button>
                    <button
                      type="button"
                      className={iconButton}
                      aria-label={`Rename ${entry.name}`}
                      onClick={() => setEditingId(entry.id)}
                    >
                      <Pencil className="size-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      className={iconButton}
                      aria-label={`Delete ${entry.name}`}
                      onClick={() => onDelete(entry.id)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {recents.length ? (
        <section
          aria-labelledby={`${id}-recent`}
          className={cn(saved.length && "border-t pt-2")}
        >
          <div className="flex items-center justify-between px-2 pb-1">
            <h3
              id={`${id}-recent`}
              className="text-muted-foreground text-xs font-medium"
            >
              Recent
            </h3>
            <button
              type="button"
              onClick={onClearRecents}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 rounded px-1 text-xs font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-[3px]"
            >
              Clear recent
            </button>
          </div>
          <ul className="space-y-0.5">
            {recents.map((entry) => (
              <li key={searchKey(entry.state)} className="flex">
                <button
                  type="button"
                  data-history-item
                  className={row}
                  onClick={() => onRun(entry.state)}
                >
                  <Clock
                    className="text-muted-foreground mt-0.5 size-4 shrink-0"
                    aria-hidden
                  />
                  <Summary state={entry.state} sets={sets} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
