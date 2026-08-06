import { NextResponse } from "next/server";
import { listActivePreviewCards, type AppPopupSummary } from "@/lib/popups";

export async function GET() {
  try {
    const cards = await listActivePreviewCards();

    return NextResponse.json({
      cards: cards.map((card: AppPopupSummary) => ({
        ...card,
        createdAt: card.createdAt.toISOString(),
        updatedAt: card.updatedAt.toISOString(),
      })),
    });
  } catch {
    // Fail silent: the preview pane simply falls back to its default state.
    return NextResponse.json({ cards: [] });
  }
}
