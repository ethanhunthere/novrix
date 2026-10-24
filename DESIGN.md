# NOVRIX Design System

Warm ink editorial. A quiet reading world for analysis, with one dense instrument panel for the Sentiment workspace.

## Identity

- **World:** warm near-black paper, off-white ink, a single crimson accent.
- **References:** WIRED (broadsheet hierarchy), Oura (warm paper, calm reading measure), Ferrari (sparse dark field, one saturated accent).
- **Borrowed:** WIRED's section hierarchy and hairline discipline; Oura's warm paper and generous reading measure; Ferrari's restraint with accent and negative space.
- **Not borrowed:** WIRED's density for density's sake, Oura's soft app-card friendliness, Ferrari's cinematic full-bleed imagery.

## Tokens

Defined in `app/globals.css`. Components use variables, not raw hex.

| Role | Value |
| --- | --- |
| Background | `--bg-base` `#0A0908` |
| Surface | `--bg-surface` `#11100E` |
| Raised | `--bg-raised` `#181512` |
| Heading ink | `--text-heading` `#F5F1EA` |
| Primary ink | `--text-primary` `#E6E0D8` |
| Secondary ink | `--text-secondary` `#A9A29A` |
| Tertiary ink | `--text-tertiary` 40% ink |
| Hairline | `--border-subtle` 6% ink |
| Default border | `--border-default` 9% ink |
| Accent | `--accent-novrix` `#C2344D` |
| Data amber | `--accent-data` `#FFA028` |
| Nominal / caution / critical | `#10B981` / `#F59E0B` / `#EF4444` |

Accent is a signal, not decoration: links on hover, current selection, one rule, one live dot. Never a gradient, glow, or large fill.

## Type

- Display: Newsreader (`--ff-display`). Page titles, section titles, article titles, pull quotes.
- Body and UI: Geist Sans (`--ff-sans`).
- Data and metadata: Geist Mono (`--ff-mono`). Tabular numerals for prices.
- Read pages: h1 `clamp(34px, 5vw, 56px)`, section h2 `23–26px` serif, body `15.5–16px` at 1.8, measure 65–75ch.
- Operate pages: 11–14px UI, 19px workspace title, mono for values.
- No third family. No all-caps body. Labels may be uppercase only when short and mono.

## Layout

- Content frame: max 1180px, padding `var(--container-pad)`.
- Reading column: 720–760px, centered. Never a narrow column pinned left inside a wide container.
- Section rhythm: 56–72px between sections on desktop, 40px on mobile. Hairline rules separate, panels do not nest.
- Grid may break the reading column only for data tables and partner lists.
- 4/8/12/16/24/32/48/64 spacing scale.

## Components

### Read pages

`components/layout/EditorialPage.tsx` owns the frame: navbar, page header, reading column, section rules, prose, data rows, footer links.

- Page header: optional mono kicker, serif h1, one-sentence standfirst, hairline.
- Section: serif h2 with a hairline above, prose beneath. No card wrapper.
- Prose: 16px sans, secondary ink, 1.8 line height. Links underline on hover with accent.
- Data rows: mono label column 140–180px, sans value. No zebra, no nested boxes.
- Footer links: one row, separated by space, arrow glyphs removed.

### Operate surface (Sentiment)

- Terminal shell is intentionally denser and darker than editorial pages.
- Keep functional data colors (zones, category accents). Do not recolor data.
- Shell chrome uses warm black surfaces and warm hairlines, crimson live state.
- Controls: visible focus ring, 40px minimum height, disabled and loading states.

### Actions

- Primary: accent text or accent 1px border on dark. No gradient buttons.
- Hover: lighten ink, 140–180ms ease-out. Press: `scale(.98)`.
- Focus-visible: 1px accent ring, 2px offset.

## Motion

- One authored moment per page at most. Editorial pages: none beyond link and state transitions.
- 120–220ms, `--ease-standard`, transform and opacity only.
- Reduced motion: keep color/opacity changes, remove movement.

## Copy

- Say what exists. No "institutional-grade" claims without substance.
- No account language, because there are no accounts.
- No invented metrics, logos, testimonials, or activity.
- Empty and error states name the cause and the next action.
- Changelog records only shipped work.

## Do not

- Cold navy or slate palettes. They belong to the retired terminal theme.
- Gradient panels, glass, glow, colored side stripes.
- Nested cards or a card for every paragraph.
- Tiny 11–12px body text on reading pages.
- All-caps eyebrow labels above every section.
- Multiple accent hues competing for attention.
- Raw hex in new components; add or use a token.

## Responsive

- 375: single column, 20px padding, h1 34px, 44px targets.
- 768: reading column, two-column data rows.
- 1440+: reading column centered, generous outer margin.
- Sentiment gates below 1024px with a clear explanation and return link.

## Agent prompt

Build NOVRIX as a warm ink editorial system with one crimson signal. Reading pages are calm, centered, serif-led, 65–75ch. The Sentiment workspace is the only dense surface. Use existing tokens. Never introduce a cold palette, gradient decoration, nested cards, or a second accent world.
