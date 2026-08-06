"use client";

import { FileText, Plus, Save, ShieldCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { AdminPanel } from "@/app/admin/dashboard/admin-tech";
import {
  ActionButton,
  Area,
  Field,
  SectionHeader,
  StatCard,
} from "@/app/admin/dashboard/admin-form-primitives";
import { toast } from "@/hooks/use-toast";
import {
  SITE_PAGE_SLUGS,
  blocksToPlainText,
  createBlocksFromPlainContent,
  type SitePage,
  type SitePageBlock,
  type SitePageLocaleOverrides,
  type SitePageSlug,
} from "@/lib/site-pages";

type AdminPagesFormState = Record<SitePageSlug, SitePage>;
type EditablePageLocale = "en" | "tr";

const pageOrder = SITE_PAGE_SLUGS;

const pageHints: Record<SitePageSlug, string> = {
  "about-us": "Company story, mission, and what the product helps people do.",
  "privacy-policy":
    "Use blocks so the Siteliyo legal page can render headings, sections, and bullet lists cleanly.",
  terms:
    "Use blocks for legal sections so the Siteliyo terms page gets a proper side navigation and structured layout.",
};

function createBlock(type: SitePageBlock["type"]): SitePageBlock {
  const baseId = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  if (type === "bullets") {
    return {
      id: baseId,
      type,
      items: ["", ""],
    };
  }

  return {
    id: baseId,
    type,
    content: "",
  };
}

export function AdminPagesForm({
  initialPages,
}: {
  initialPages: AdminPagesFormState;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initialPages);
  const [activeLocale, setActiveLocale] = useState<EditablePageLocale>("en");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isTurkish = activeLocale === "tr";

  function updateField<K extends keyof SitePage>(
    slug: SitePageSlug,
    key: K,
    value: SitePage[K],
  ) {
    setForm((current) => ({
      ...current,
      [slug]: {
        ...current[slug],
        [key]: value,
      },
    }));
  }

  function updatePageTranslations(
    slug: SitePageSlug,
    updater: (current: SitePageLocaleOverrides) => SitePageLocaleOverrides,
  ) {
    setForm((current) => {
      const nextTranslations = updater(current[slug].translations?.tr ?? {});

      return {
        ...current,
        [slug]: {
          ...current[slug],
          translations: {
            ...(current[slug].translations ?? {}),
            tr: nextTranslations,
          },
        },
      };
    });
  }

  function getLocalizedFieldValue(
    page: SitePage,
    key: "title" | "summary" | "content",
  ) {
    return isTurkish ? page.translations?.tr?.[key] ?? "" : page[key];
  }

  function updateLocalizedField(
    slug: SitePageSlug,
    key: "title" | "summary" | "content",
    value: string,
  ) {
    if (!isTurkish) {
      updateField(slug, key, value);
      return;
    }

    updatePageTranslations(slug, (current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateBlock(
    slug: SitePageSlug,
    blockId: string,
    updater: (block: SitePageBlock) => SitePageBlock,
  ) {
    setForm((current) => ({
      ...current,
      [slug]: {
        ...current[slug],
        blocks: current[slug].blocks.map((block) =>
          block.id === blockId ? updater(block) : block,
        ),
      },
    }));
  }

  function getTranslatedBlock(page: SitePage, index: number) {
    return page.translations?.tr?.blocks?.[index];
  }

  function getLocalizedBlockValue(
    page: SitePage,
    block: SitePageBlock,
    index: number,
  ) {
    if (!isTurkish) {
      return block.type === "bullets" ? block.items : block.content;
    }

    const translated = getTranslatedBlock(page, index);

    if (!translated || translated.type !== block.type) {
      return block.type === "bullets" ? block.items.map(() => "") : "";
    }

    if (block.type === "bullets") {
      return translated.type === "bullets"
        ? translated.items ?? block.items.map(() => "")
        : block.items.map(() => "");
    }

    return translated.type === "heading" || translated.type === "paragraph"
      ? translated.content ?? ""
      : "";
  }

  function updateLocalizedBlockContent(
    slug: SitePageSlug,
    block: SitePageBlock,
    index: number,
    value: string,
  ) {
    if (!isTurkish) {
      updateBlock(slug, block.id, (currentBlock) =>
        currentBlock.type === "heading" || currentBlock.type === "paragraph"
          ? {
              ...currentBlock,
              content: value,
            }
          : currentBlock,
      );
      return;
    }

    updatePageTranslations(slug, (current) => {
      const nextBlocks = [...(current.blocks ?? [])];
      nextBlocks[index] = {
        id: block.id,
        type: block.type,
        content: value,
      };

      return {
        ...current,
        blocks: nextBlocks,
      };
    });
  }

  function updateLocalizedBulletItem(
    slug: SitePageSlug,
    block: Extract<SitePageBlock, { type: "bullets" }>,
    blockIndex: number,
    itemIndex: number,
    value: string,
  ) {
    if (!isTurkish) {
      updateBlock(slug, block.id, (currentBlock) =>
        currentBlock.type === "bullets"
          ? {
              ...currentBlock,
              items: currentBlock.items.map((currentItem, currentIndex) =>
                currentIndex === itemIndex ? value : currentItem,
              ),
            }
          : currentBlock,
      );
      return;
    }

    updatePageTranslations(slug, (current) => {
      const nextBlocks = [...(current.blocks ?? [])];
      const existing = nextBlocks[blockIndex];
      const nextItems =
        existing && existing.type === "bullets"
          ? [...(existing.items ?? block.items.map(() => ""))]
          : block.items.map(() => "");
      nextItems[itemIndex] = value;

      nextBlocks[blockIndex] = {
        id: block.id,
        type: "bullets",
        items: nextItems,
      };

      return {
        ...current,
        blocks: nextBlocks,
      };
    });
  }

  function removeBlock(slug: SitePageSlug, blockId: string) {
    setForm((current) => ({
      ...current,
      [slug]: {
        ...current[slug],
        blocks: current[slug].blocks.filter((block) => block.id !== blockId),
      },
    }));
  }

  function addBlock(slug: SitePageSlug, type: SitePageBlock["type"]) {
    setForm((current) => ({
      ...current,
      [slug]: {
        ...current[slug],
        blocks: [...current[slug].blocks, createBlock(type)],
      },
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/admin/pages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; pages?: AdminPagesFormState }
      | null;

    if (!response.ok || !payload?.pages) {
      setError(payload?.error || "Could not save site pages.");
      return;
    }

    startTransition(() => {
      setForm(payload.pages!);
      router.refresh();
    });

    toast({
      title: "Pages saved",
      description: "Public page content was updated.",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_340px]">
      <div className="grid gap-6">
        <AdminPanel>
          <div className="grid gap-5">
            <SectionHeader
              eyebrow="Localization"
              title="Edit public pages by locale"
              description="English stays as the base content. Turkish fields are optional overrides and fall back to English whenever you leave them empty."
            />

            <div className="flex flex-wrap gap-3">
              {[
                { value: "en", label: "English base" },
                { value: "tr", label: "Turkish override" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setActiveLocale(option.value as EditablePageLocale)}
                  className={`rounded-2xl border px-4 py-2 text-sm font-medium transition ${
                    activeLocale === option.value
                      ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                      : "border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="theme-admin-subpanel rounded-[24px] border p-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              {isTurkish
                ? "You are editing Turkish text only. For legal pages, block structure stays shared across locales while the text inside each block can be translated separately."
                : "You are editing the base English content. Turkish uses these values as fallback whenever a translated field is left empty."}
            </div>
          </div>
        </AdminPanel>

        {pageOrder.map((slug) => {
          const page = form[slug];
          const useBlockEditor = slug === "privacy-policy" || slug === "terms";

          return (
            <AdminPanel key={slug}>
              <div className="grid gap-6">
                <SectionHeader
                  eyebrow={slug.replace("-", " ")}
                  title={page.title}
                  description={pageHints[slug]}
                  action={
                    useBlockEditor && !isTurkish ? (
                      <div className="flex flex-wrap gap-2">
                        <ActionButton onClick={() => addBlock(slug, "heading")}>
                          <Plus className="h-4 w-4" />
                          Heading
                        </ActionButton>
                        <ActionButton onClick={() => addBlock(slug, "paragraph")}>
                          <Plus className="h-4 w-4" />
                          Paragraph
                        </ActionButton>
                        <ActionButton onClick={() => addBlock(slug, "bullets")}>
                          <Plus className="h-4 w-4" />
                          Bullets
                        </ActionButton>
                      </div>
                    ) : null
                  }
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Title"
                    value={getLocalizedFieldValue(page, "title")}
                    onChange={(event) =>
                      updateLocalizedField(slug, "title", event.target.value)
                    }
                    placeholder={isTurkish ? "Falls back to English when empty" : undefined}
                  />
                  <Field
                    label="Summary"
                    value={getLocalizedFieldValue(page, "summary")}
                    onChange={(event) =>
                      updateLocalizedField(slug, "summary", event.target.value)
                    }
                    placeholder={isTurkish ? "Falls back to English when empty" : undefined}
                  />

                  {useBlockEditor ? (
                    <div className="sm:col-span-2 grid gap-4">
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <StatCard
                          label="Blocks"
                          value={page.blocks.length}
                          detail="Structured blocks power the legal page layout and sidebar."
                        />
                        <StatCard
                          label="Headings"
                          value={page.blocks.filter((block) => block.type === "heading").length}
                          detail="Use headings to create clear section breaks."
                        />
                        <StatCard
                          label="Bullet groups"
                          value={page.blocks.filter((block) => block.type === "bullets").length}
                          detail="Lists help dense legal content stay scannable."
                        />
                      </div>

                      {page.blocks.map((block, index) => (
                        <div
                          key={block.id}
                          className="theme-admin-subpanel-strong rounded-[26px] border p-4 sm:p-5"
                        >
                          <div className="flex flex-col gap-4 border-b border-[hsl(var(--border)/0.75)] pb-4 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                                Block {index + 1}
                              </p>
                              <p className="mt-1 text-sm capitalize text-[hsl(var(--muted-foreground))]">
                                {block.type}
                              </p>
                            </div>
                            <ActionButton
                              variant="danger"
                              onClick={() => removeBlock(slug, block.id)}
                              disabled={isTurkish}
                            >
                              <Trash2 className="h-4 w-4" />
                              Remove block
                            </ActionButton>
                          </div>

                          <div className="mt-5 grid gap-3">
                            {block.type === "bullets" ? (
                              <>
                                {block.items.map((item, itemIndex) => (
                                  <div
                                    key={`${block.id}-${itemIndex}`}
                                    className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]"
                                  >
                                    <Field
                                      label={`Bullet ${itemIndex + 1}`}
                                      value={
                                        (
                                          getLocalizedBlockValue(
                                            page,
                                            block,
                                            index,
                                          ) as string[]
                                        )[itemIndex] ?? ""
                                      }
                                      onChange={(event) =>
                                        updateLocalizedBulletItem(
                                          slug,
                                          block,
                                          index,
                                          itemIndex,
                                          event.target.value,
                                        )
                                      }
                                      placeholder="Bullet text"
                                    />
                                    <div className="flex items-end">
                                      <ActionButton
                                        variant="danger"
                                        onClick={() =>
                                          updateBlock(slug, block.id, (currentBlock) =>
                                            currentBlock.type === "bullets"
                                              ? {
                                                  ...currentBlock,
                                                  items: currentBlock.items.filter(
                                                    (_, currentIndex) =>
                                                      currentIndex !== itemIndex,
                                                  ),
                                                }
                                              : currentBlock,
                                          )
                                        }
                                        disabled={isTurkish}
                                        className="w-full md:w-auto"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        Remove item
                                      </ActionButton>
                                    </div>
                                  </div>
                                ))}

                                <div className="flex justify-end">
                                  <ActionButton
                                    onClick={() =>
                                      updateBlock(slug, block.id, (currentBlock) =>
                                        currentBlock.type === "bullets"
                                          ? {
                                              ...currentBlock,
                                              items: [...currentBlock.items, ""],
                                            }
                                          : currentBlock,
                                      )
                                    }
                                    disabled={isTurkish}
                                  >
                                    <Plus className="h-4 w-4" />
                                    Add bullet
                                  </ActionButton>
                                </div>
                              </>
                            ) : (
                              <Area
                                label={block.type === "heading" ? "Heading" : "Paragraph"}
                                rows={block.type === "heading" ? 2 : 5}
                                value={getLocalizedBlockValue(page, block, index) as string}
                                onChange={(event) =>
                                  updateLocalizedBlockContent(
                                    slug,
                                    block,
                                    index,
                                    event.target.value,
                                  )
                                }
                                placeholder={
                                  isTurkish
                                    ? "Falls back to English when empty"
                                    : undefined
                                }
                              />
                            )}
                          </div>
                        </div>
                      ))}

                      <Area
                        label="Plain text fallback preview"
                        rows={8}
                        value={
                          isTurkish
                            ? blocksToPlainText(
                                page.blocks.map((block, index) => {
                                  const localized = getLocalizedBlockValue(
                                    page,
                                    block,
                                    index,
                                  );

                                  if (block.type === "bullets") {
                                    return {
                                      ...block,
                                      items: localized as string[],
                                    };
                                  }

                                  return {
                                    ...block,
                                    content: localized as string,
                                  };
                                }),
                              )
                            : blocksToPlainText(page.blocks)
                        }
                        onChange={(event) => {
                          if (isTurkish) {
                            return;
                          }
                          const blocks = createBlocksFromPlainContent(event.target.value);
                          setForm((current) => ({
                            ...current,
                            [slug]: {
                              ...current[slug],
                              content: event.target.value,
                              blocks,
                            },
                          }));
                        }}
                        helper="You can paste plain text here and it will be converted into paragraph blocks."
                        inputClassName={isTurkish ? "opacity-80" : undefined}
                      />
                    </div>
                  ) : (
                    <Area
                      label="Content"
                      rows={12}
                      value={getLocalizedFieldValue(page, "content")}
                      onChange={(event) =>
                        updateLocalizedField(slug, "content", event.target.value)
                      }
                      className="sm:col-span-2"
                      helper="Paragraph breaks are preserved on the public page."
                      placeholder={isTurkish ? "Falls back to English when empty" : undefined}
                    />
                  )}
                </div>
              </div>
            </AdminPanel>
          );
        })}
      </div>

      <div className="grid gap-6 xl:sticky xl:top-6 xl:self-start">
        <AdminPanel>
          <div className="grid gap-5">
            <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--background)/0.92),hsl(var(--secondary)/0.88))] p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[hsl(var(--muted-foreground))]">
                    Public page editor
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[hsl(var(--foreground))]">
                    Keep legal and brand pages current
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                    Use structured blocks for legal pages and simple long-form text for
                    the brand story page.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <StatCard
                label="Editable pages"
                value={pageOrder.length}
                detail="Terms, privacy policy, and about us are managed here."
              />
              <StatCard
                label="Legal blocks"
                value={
                  pageOrder.reduce(
                    (count, slug) =>
                      count +
                      (slug === "privacy-policy" || slug === "terms"
                        ? form[slug].blocks.length
                        : 0),
                    0,
                  )
                }
                detail="These blocks shape the structured Siteliyo legal layouts."
              />
              <StatCard
                label="About copy"
                value={form["about-us"].content.trim().length || 0}
                detail="Character count for the long-form About Us page content."
              />
            </div>

            <div className="theme-admin-subpanel rounded-[24px] border p-4">
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                Editing notes
              </p>
              <div className="mt-3 space-y-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                <p>Legal pages read better when headings make each policy area easy to jump to.</p>
                <p>Bullet blocks work best for rights, obligations, or lists of conditions.</p>
                <p>The About Us page can stay more narrative and less formally structured.</p>
              </div>
            </div>

            <div className="theme-admin-subpanel rounded-[24px] border p-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--accent))]" />
                <p>Terms and privacy content supports the Siteliyo legal layouts and side navigation.</p>
              </div>
              <div className="mt-3 flex items-start gap-3">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--accent))]" />
                <p>Saving here updates the public footer routes immediately.</p>
              </div>
            </div>

            {error ? (
              <div className="rounded-[24px] border border-[hsl(var(--destructive)/0.24)] bg-[hsl(var(--destructive)/0.08)] p-4 text-sm text-[hsl(var(--destructive))]">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isPending}
              className="theme-button-primary inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Save className="h-4 w-4" />
              {isPending ? "Saving changes..." : "Save pages"}
            </button>
          </div>
        </AdminPanel>
      </div>
    </form>
  );
}
