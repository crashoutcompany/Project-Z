"use client";

import LazyImage from "@/components/LazyImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { CardDetail } from "@/lib/card-detail";
import {
  buildCardFacts,
  sheetHeading,
  shinedustLabel,
  titleCase,
} from "@/lib/card-facts";
import { cn } from "@/lib/utils";
import { Check, Copy, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

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

export type CardDetailSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: CardDetail | null;
  loading: boolean;
  error: string | null;
  shareUrl?: string | null;
};

type SheetContentProps = Omit<CardDetailSheetProps, "open" | "onOpenChange">;

/**
 * Right-side inspect panel built on a native modal `<dialog>`: the browser
 * provides the focus trap, inert background, Escape handling and top-layer
 * stacking (above the sticky navbar), so none of that is reimplemented here.
 */
export function CardDetailSheet({
  open,
  onOpenChange,
  ...content
}: CardDetailSheetProps) {
  // Mounting the dialog is what opens it, so the effects below never need an
  // `open` dependency.
  if (!open) return null;
  return <CardDetailDialog onOpenChange={onOpenChange} {...content} />;
}

function CardDetailDialog({
  onOpenChange,
  detail,
  loading,
  error,
  shareUrl,
}: SheetContentProps & { onOpenChange: (open: boolean) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  const titleId = useId();
  const descriptionId = useId();
  const { title, description } = sheetHeading(detail, loading);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  // Driven imperatively on purpose: passing React's `open` prop to a modal
  // dialog lets React reset the attribute after `showModal()`.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (!dialog.open) dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const close = () => onOpenChangeRef.current(false);

    // Escape fires `cancel`. Let the parent own the state (and the URL sync)
    // instead of letting the browser close the dialog behind its back.
    const onCancel = (event: Event) => {
      event.preventDefault();
      close();
    };

    // Clicks on `::backdrop` are dispatched to the dialog itself. Require the
    // press to start there too, so dragging a text selection out of the panel
    // doesn't dismiss it. Keyboard users have Escape and the Close button.
    let pressStartedOnBackdrop = false;
    const onMouseDown = (event: MouseEvent) => {
      pressStartedOnBackdrop = event.target === dialog;
    };
    const onClick = (event: MouseEvent) => {
      if (pressStartedOnBackdrop && event.target === dialog) close();
    };

    dialog.addEventListener("cancel", onCancel);
    dialog.addEventListener("mousedown", onMouseDown);
    dialog.addEventListener("click", onClick);

    return () => {
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("mousedown", onMouseDown);
      dialog.removeEventListener("click", onClick);
      document.body.style.overflow = previousOverflow;
      dialog.close();
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      data-testid="card-detail-sheet"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="bg-background text-foreground fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-md border-0 border-l p-0 shadow-lg outline-none backdrop:bg-black/10 backdrop:backdrop-blur-xs"
    >
      <div className="flex h-full flex-col">
        <div className="relative flex items-start justify-between gap-3 border-b px-4 py-4 pr-12">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold tracking-tight">
              {title}
            </h2>
            <p id={descriptionId} className="text-muted-foreground text-sm">
              {description}
            </p>
          </div>
          <button
            type="button"
            data-testid="card-detail-close"
            className="hover:bg-muted absolute top-4 right-4 inline-flex size-8 items-center justify-center rounded-md"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
          </button>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <CardDetailBody
            detail={detail}
            loading={loading}
            error={error}
            shareUrl={shareUrl}
          />
        </ScrollArea>
      </div>
    </dialog>
  );
}

function CardDetailBody({
  detail,
  loading,
  error,
  shareUrl,
}: SheetContentProps) {
  return (
    <div className="space-y-5 px-4 py-4">
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <CardArt detail={detail} />
      <CardFacts detail={detail} loading={loading} />
      {detail ? <CardBadges detail={detail} /> : null}
      <CardText detail={detail} loading={loading} />
      {shareUrl ? <CopyLinkButton shareUrl={shareUrl} /> : null}
    </div>
  );
}

function CardArt({ detail }: { detail: CardDetail | null }) {
  return (
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
  );
}

function CardFacts({
  detail,
  loading,
}: {
  detail: CardDetail | null;
  loading: boolean;
}) {
  if (detail) {
    return (
      <dl className="grid grid-cols-2 gap-3 text-sm">
        {buildCardFacts(detail).map((fact) => (
          <Meta key={fact.label} label={fact.label} value={fact.value} />
        ))}
      </dl>
    );
  }
  if (!loading) return null;
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

function CardBadges({ detail }: { detail: CardDetail }) {
  const shinedust = shinedustLabel(detail);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={detail.isTradeable ? "secondary" : "outline"}>
        {detail.isTradeable ? "Tradeable" : "Not tradeable"}
      </Badge>
      {shinedust ? <Badge variant="outline">{shinedust}</Badge> : null}
    </div>
  );
}

function CardText({
  detail,
  loading,
}: {
  detail: CardDetail | null;
  loading: boolean;
}) {
  const ability = detail?.effects.find((e) => e.kind === "ABILITY");
  const trainerText = detail?.effects.find((e) => e.kind === "TRAINER");
  const attacks = detail?.attacks ?? [];

  if (loading && detail && attacks.length === 0 && !ability && !trainerText) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <>
      {ability ? (
        <EffectSection
          heading="Ability"
          name={ability.name}
          text={ability.effectText}
        />
      ) : null}
      {attacks.length > 0 ? <AttackList attacks={attacks} /> : null}
      {trainerText ? (
        <EffectSection
          heading="Trainer text"
          name={trainerText.name}
          text={trainerText.effectText}
        />
      ) : null}
    </>
  );
}

function EffectSection({
  heading,
  name,
  text,
}: {
  heading: string;
  name: string | null;
  text: string;
}) {
  return (
    <section className="space-y-1">
      <h3 className="text-sm font-semibold tracking-tight">
        {heading}
        {name ? ` · ${name}` : ""}
      </h3>
      <p className="text-muted-foreground text-sm text-pretty">
        {text || "No effect text."}
      </p>
    </section>
  );
}

function AttackList({ attacks }: { attacks: CardDetail["attacks"] }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold tracking-tight">Attacks</h3>
      <ul className="space-y-2">
        {attacks.map((atk) => (
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
  );
}

function EnergyPips({ types }: { types: string[] }) {
  if (types.length === 0) {
    return <span className="text-muted-foreground text-xs">Free</span>;
  }
  return (
    <span
      className="inline-flex items-center gap-1"
      aria-label={`${types.length} energy`}
    >
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

function CopyLinkButton({ shareUrl }: { shareUrl: string }) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  async function copyLink() {
    const absolute = new URL(shareUrl, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
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
