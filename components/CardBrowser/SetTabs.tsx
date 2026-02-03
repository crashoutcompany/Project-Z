"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SetTabsProps } from "./types";

export function SetTabs({ sets, activeSetId, onSetChange, disabled }: SetTabsProps) {
  return (
    <div className="w-full overflow-x-auto pb-2">
      <Tabs
        value={String(activeSetId)}
        onValueChange={(value) => onSetChange(Number(value))}
      >
        <TabsList className="inline-flex h-auto w-max gap-1 bg-muted/50 p-1">
          {sets.map((set) => (
            <TabsTrigger
              key={set.id}
              value={String(set.id)}
              disabled={disabled}
              className="whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              {set.setName}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
