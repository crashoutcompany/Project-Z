"use client";

import LazyImage from "@/components/LazyImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { CardDetail } from "@/lib/card-detail";
import { formatShinedust, getRarityInfo, getShinedustCost } from "@/lib/rarity";
import { cn } from "@/lib/utils";
import { Check, Copy, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

const ENERGY_COLORS: Record<string, string> = {
  grass: "bg-green-500",
  fire: "bg-orange-500",
  water: "bg-blue-500",
  lightning: "bg-yellow-400",
  psychic: "bg-purple-500",
  fighting: "bg-orange-800",
  darkness: "bg-slate-800",
  metal: "bg-slate-400",
  dragon: "bg-amber-600",
  colorless: "bg-zinc-300",
};

const STAGE_LABEL: Record<string, string> = {
  BASIC: "Basic",
  STAGE1: "Stage 1",
  STAGE2: "Stage 2",
};

const TRAINER_LABEL: Record<string, string> = {
  SUPPORTER: "Supporter",
  ITEM: "Item",
  TOOL: "Tool",
  STADIUM: "Stadium",
};

export type CardDetailSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: CardDetail | null;
  loading: boolean;
  error: string | null;
  shareUrl?: string | null;
};

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function EnergyPips({ types }: { types: string[] }) {
  if (types.length === 0) {
    return <span className="text-muted-foreground text-xs">Free</span>;
  }
  return (
    <span className="inline-flex items-center gap-1" aria-label={`${types.length} energy`}>
      {types.map((type, i) => (
        <span
          key={`${type}-${i}`}
          title={titleCase(type)}
          className={cn(
            "size-3.5 rounded-full ring-1 ring-foreground/15",
            ENERGY_COLORS[type] ?? "bg-muted",
          )}
        />
      ))}
    </span>
  );
}

/** Right-side inspect panel, portaled to body so it stacks above CatalogShell isolate. */
export function CardDetailSheet({
  open,
  onOpenChange,
  detail,
  loading,
  error,
  shareUrl,
}: CardDetailSheetProps) {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const rarity = detail ? getRarityInfo(detail.rarity) : null;
  const shinedust = detail
    ? getShinedustCost(detail.rarity, detail.isTradeable)
    : null;
  const ability = detail?.effects.find((e) => e.kind === "ABILITY");
  const trainerText = detail?.effects.find((e) => e.kind === "TRAINER");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onOpenChange]);

  async function copyLink() {
    if (!shareUrl) return;
    const absolute =
      typeof window === "undefined"
        ? shareUrl
        : new URL(shareUrl, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        aria-label="Close card details"
        className="absolute inset-0 z-0 bg-black/10 backdrop-blur-xs"
        onClick={() => onOpenChange(false)}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="bg-background text-foreground absolute inset-y-0 right-0 z-10 flex h-dvh w-full max-w-md flex-col border-l shadow-lg outline-none"
      >
        <div className="relative flex items-start justify-between gap-3 border-b px-4 py-4 pr-12">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold tracking-tight">
              {detail?.name ?? (loading ? "Loading card" : "Card")}
              {detail?.isEx ? " ex" : ""}
            </h2>
            <p id={descriptionId} className="text-muted-foreground text-sm">
              {detail
                ? `${detail.setName} · ${detail.ref}`
                : loading
                  ? "Loading card details"
                  : "Card details"}
            </p>
          </div>
          <button
            type="button"
            className="hover:bg-muted absolute top-4 right-4 inline-flex size-8 items-center justify-center rounded-md"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
          </button>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-5 px-4 py-4">
            {error ? (
              <p className="text-destructive text-sm">{error}</p>
            ) : null}

            <div className="mx-auto w-full max-w-[16rem]">
              {detail ? (
                <LazyImage
                  title={detail.name}
                  alt={detail.name}
                  src={detail.imageUrl}
                  width={320}
                  height={448}
                  priority
                  className="h-auto w-full rounded-xl shadow-xs ring-1 ring-foreground/10"
                />
              ) : (
                <Skeleton className="aspect-[5/7] w-full rounded-xl" />
              )}
            </div>

            {detail && rarity ? (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Meta label="Set / number" value={detail.ref} />
                <Meta
                  label="Rarity"
                  value={`${rarity.symbol} ${rarity.name}`}
                />
                {detail.hp != null ? (
                  <Meta label="HP" value={String(detail.hp)} />
                ) : null}
                {detail.energyType ? (
                  <Meta label="Type" value={titleCase(detail.energyType)} />
                ) : null}
                {detail.stage ? (
                  <Meta
                    label="Stage"
                    value={STAGE_LABEL[detail.stage] ?? detail.stage}
                  />
                ) : null}
                {detail.trainerType ? (
                  <Meta
                    label="Trainer"
                    value={
                      TRAINER_LABEL[detail.trainerType] ?? detail.trainerType
                    }
                  />
                ) : null}
              </dl>
            ) : loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : null}

            {detail ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={detail.isTradeable ? "secondary" : "outline"}>
                  {detail.isTradeable ? "Tradeable" : "Not tradeable"}
                </Badge>
                {shinedust != null ? (
                  <Badge variant="outline">
                    {shinedust === 0
                      ? "0 Shinedust"
                      : `${formatShinedust(shinedust)} Shinedust`}
                  </Badge>
                ) : null}
              </div>
            ) : null}

            {loading &&
            detail &&
            detail.attacks.length === 0 &&
            !ability &&
            !trainerText ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ) : null}

            {ability ? (
              <section className="space-y-1">
                <h3 className="text-sm font-semibold tracking-tight">
                  Ability{ability.name ? ` · ${ability.name}` : ""}
                </h3>
                <p className="text-muted-foreground text-sm text-pretty">
                  {ability.effectText || "No effect text."}
                </p>
              </section>
            ) : null}

            {detail && detail.attacks.length > 0 ? (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold tracking-tight">
                  Attacks
                </h3>
                <ul className="space-y-2">
                  {detail.attacks.map((atk) => (
                    <li
                      key={`${atk.position}-${atk.name}`}
                      className="rounded-xl bg-muted/40 p-3 ring-1 ring-foreground/10"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <EnergyPips types={atk.energyTypes} />
                          <span className="font-medium">{atk.name}</span>
                        </div>
                        {atk.damageRaw ? (
                          <span className="tabular-nums font-semibold">
                            {atk.damageRaw}
                          </span>
                        ) : null}
                      </div>
                      {atk.effectText ? (
                        <p className="text-muted-foreground mt-1.5 text-sm text-pretty">
                          {atk.effectText}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {trainerText ? (
              <section className="space-y-1">
                <h3 className="text-sm font-semibold tracking-tight">
                  Trainer text
                  {trainerText.name ? ` · ${trainerText.name}` : ""}
                </h3>
                <p className="text-muted-foreground text-sm text-pretty">
                  {trainerText.effectText || "No effect text."}
                </p>
              </section>
            ) : null}

            {shareUrl ? (
              <Button
                type="button"
                variant="outline"
                className="w-full active:scale-[0.97] motion-reduce:active:scale-100"
                nativeButton
                onClick={() => void copyLink()}
              >
                {copied ? <Check /> : <Copy />}
                {copied ? "Copied link" : "Copy link"}
              </Button>
            ) : null}
          </div>
        </ScrollArea>
      </aside>
    </div>,
    document.body,
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
