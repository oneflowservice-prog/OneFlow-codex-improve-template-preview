# Design guidance library

Siteliyo's coding AI discovers Markdown design references from this directory.

- Use `taste-SKILL.md` for universal design-quality and anti-generic guidance.
- Use `<direction>-DESIGN.md` for selectable visual reference systems.
- Include frontmatter `name` and `description` fields when possible. The description should explain the products and moods the direction suits so the router can select it accurately.
- New Markdown files are detected automatically; an application restart is not required.

For a library stored outside the repository, set `DESIGN_GUIDES_DIR` to its absolute directory. Local development also detects a `designs mds` folder on the current user's Desktop.

Design references guide visual decisions only. The coding model still follows the user's requirements, the existing project's design system, accessibility requirements, and Siteliyo's technical and file-output rules.
