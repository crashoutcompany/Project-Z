"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SetTabsProps } from "./types";
import { cn } from "@/lib/utils";

export function SetTabs({
  sets,
  activeSetId,
  onSetChange,
  disabled,
}: SetTabsProps) {
  return (
    <div className="w-full overflow-x-auto pb-1 [scrollbar-width:thin]">
      <Tabs
        value={String(activeSetId)}
        onValueChange={(value) => onSetChange(Number(value))}
      >
        <TabsList className="bg-muted/60 inline-flex h-auto w-max gap-1 rounded-xl p-1">
          {sets.map((set) => (
            <TabsTrigger
              key={set.id}
              value={String(set.id)}
              disabled={disabled}
              className={cn(
                "h-8 gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap",
                "transition-[background-color,color,box-shadow] duration-150 ease-out",
              )}
            >
              {set.code ? (
                <span className="text-muted-foreground font-mono text-[11px]">
                  {set.code}
                </span>
              ) : null}
              {set.setName}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
