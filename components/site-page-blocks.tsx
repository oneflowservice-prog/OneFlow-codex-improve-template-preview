import type { SitePageBlock } from "@/lib/site-pages";

export function getSitePageHeadingLinks(blocks: SitePageBlock[]) {
  return blocks
    .filter(
      (block): block is Extract<SitePageBlock, { type: "heading" }> =>
        block.type === "heading" && block.content.trim().length > 0,
    )
    .map((block, index) => ({
      id: block.id || `heading-${index + 1}`,
      label: block.content,
    }));
}

export function SitePageBlocks({
  blocks,
  className = "",
  headingClassName = "",
  paragraphClassName = "",
  listClassName = "",
  listItemClassName = "",
}: {
  blocks: SitePageBlock[];
  className?: string;
  headingClassName?: string;
  paragraphClassName?: string;
  listClassName?: string;
  listItemClassName?: string;
}) {
  return (
    <div className={className}>
      {blocks.map((block) => {
        if (block.type === "heading") {
          return (
            <section key={block.id} id={block.id}>
              <h2 className={headingClassName}>{block.content}</h2>
            </section>
          );
        }

        if (block.type === "paragraph") {
          return (
            <div key={block.id}>
              <p className={paragraphClassName}>{block.content}</p>
            </div>
          );
        }

        return (
          <div key={block.id}>
            <ul className={listClassName}>
              {block.items.map((item, index) => (
                <li key={`${block.id}-${index}`} className={listItemClassName}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
