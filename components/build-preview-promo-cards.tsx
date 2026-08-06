"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type PreviewPromoCard = {
  id: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string | null;
  imageUrl: string | null;
};

const ROTATE_INTERVAL_MS = 6000;

/**
 * Rotating promo cards shown in the preview pane while the AI is coding and the
 * preview is building. Admins manage the cards from /admin/dashboard/popups
 * (audience: "Preview cards"). Renders nothing when no cards are configured.
 */
export function BuildPreviewPromoCards() {
  const [cards, setCards] = useState<PreviewPromoCard[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/popups/preview-cards")
      .then((response) => (response.ok ? response.json() : { cards: [] }))
      .then((payload: { cards?: PreviewPromoCard[] }) => {
        if (!cancelled) setCards(payload.cards ?? []);
      })
      .catch(() => {
        if (!cancelled) setCards([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const cardCount = cards?.length ?? 0;

  useEffect(() => {
    if (cardCount < 2 || isPaused) return;

    intervalRef.current = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % cardCount);
    }, ROTATE_INTERVAL_MS);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [cardCount, isPaused]);

  if (!cards || cards.length === 0) return null;

  const activeCard = cards[activeIndex % cards.length];

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center px-6">
      <div
        className="pointer-events-auto w-[min(92vw,380px)]"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div
          key={activeCard.id}
          className="rounded-xl border border-white/10 bg-[#2a2a2a]/95 p-5 text-white shadow-[0_18px_44px_-28px_rgba(0,0,0,0.95)] backdrop-blur"
        >
          {activeCard.imageUrl ? (
            <div className="mb-3 overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeCard.imageUrl}
                alt=""
                className="h-28 w-full object-cover"
              />
            </div>
          ) : null}
          <p className="text-sm font-semibold leading-5">{activeCard.title}</p>
          <p className="mt-2 line-clamp-4 text-[13px] leading-5 text-zinc-300">
            {activeCard.body}
          </p>
          {activeCard.ctaUrl ? (
            <a
              href={activeCard.ctaUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex h-8 items-center justify-center gap-2 rounded-md bg-white/10 px-3 text-xs font-semibold text-white transition hover:bg-white/20"
            >
              {activeCard.ctaLabel || "Learn more"}
              <ArrowRight className="size-3.5" />
            </a>
          ) : null}
        </div>

        {cards.length > 1 ? (
          <div className="mt-3 flex items-center justify-center gap-1.5">
            {cards.map((card, index) => (
              <button
                key={card.id}
                type="button"
                aria-label={`Show card ${index + 1}`}
                onClick={() => setActiveIndex(index)}
                data-active={index === activeIndex % cards.length || undefined}
                className="h-1.5 w-1.5 rounded-full bg-white/25 transition-all data-[active]:w-4 data-[active]:bg-white/80"
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
