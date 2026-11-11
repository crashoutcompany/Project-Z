"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MAX_NAME_LENGTH } from "@/lib/search-history";

type SaveSearchButtonProps = {
  /** Prefills the name field, e.g. the query. */
  suggestedName: string;
  onSave: (name: string) => void;
};

/** Names the current search and keeps it in the SearchBox dropdown. */
export function SaveSearchButton({
  suggestedName,
  onSave,
}: SaveSearchButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setName(suggestedName);
        setOpen(next);
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-foreground h-9 shrink-0 gap-1.5 px-2.5 pointer-coarse:h-11"
          />
        }
      >
        <Bookmark className="size-4" aria-hidden />
        Save search
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={8}
        className="w-[min(20rem,calc(100vw-2rem))] gap-3 p-3"
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            onSave(name);
            setOpen(false);
          }}
        >
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Name this search</span>
            <Input
              autoFocus
              value={name}
              maxLength={MAX_NAME_LENGTH}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grass attackers"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!name.trim()}>
              Save
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
