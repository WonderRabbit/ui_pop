# ui-pop Design System

## 1. Atmosphere & Identity

ui-pop feels like a quiet source-evidence workbench: dense enough for repeated
review, restrained enough that source confidence and unresolved facts stay
visible. The signature is annotated structure: every generated UI surface shows
what was found, where it came from, and what still needs human review.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
|------|-------|-------|------|-------|
| Surface/primary | --surface-primary | #F7F8FA | #111318 | Page background |
| Surface/secondary | --surface-secondary | #FFFFFF | #171A21 | Main panels |
| Surface/elevated | --surface-elevated | #F1F4F7 | #20242D | State and evidence blocks |
| Text/primary | --text-primary | #17202A | #F4F7FA | Headings and primary labels |
| Text/secondary | --text-secondary | #536170 | #A8B3C0 | Body copy and metadata |
| Text/tertiary | --text-tertiary | #7B8794 | #768291 | Muted annotations |
| Border/default | --border-default | #D9E0E7 | #303846 | Panel boundaries |
| Border/subtle | --border-subtle | #E8EDF2 | #252B35 | Table and section dividers |
| Accent/primary | --accent-primary | #256F7E | #4CA6B5 | Focus, selected, confirmed facts |
| Accent/hover | --accent-hover | #1F5D69 | #6AB7C3 | Hover state |
| Status/success | --status-success | #16835B | #43C58E | Runtime-confirmed indicators |
| Status/warning | --status-warning | #B7791F | #E0A440 | Source-static indicators |
| Status/error | --status-error | #B84A4A | #E06C6C | Invalid or mismatch indicators |
| Status/info | --status-info | #3D68A8 | #79A3E0 | Neutral helper information |

### Rules

- Accent is used only for interactive controls and confirmed evidence.
- Confidence labels use status tokens, never decorative color.
- No purple-blue gradients, decorative blobs, or background effects.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| H1 | 28px | 700 | 1.2 | 0 | Wireframe title |
| H2 | 20px | 650 | 1.3 | 0 | Section headings |
| H3 | 16px | 650 | 1.4 | 0 | Component group labels |
| Body | 14px | 400 | 1.55 | 0 | Default text |
| Body/sm | 13px | 400 | 1.45 | 0 | Metadata and helper text |
| Caption | 12px | 600 | 1.35 | 0.04em | Confidence and source labels |

### Font Stack

- Primary: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
- Mono: "SFMono-Regular", Consolas, "Liberation Mono", monospace

### Rules

- Generated wireframes are functional documents, not marketing pages.
- Body text never drops below 12px.
- Source references use the mono stack.

## 4. Spacing & Layout

### Base Unit

All spacing derives from a base of 4px.

| Token | Value | Usage |
|-------|-------|-------|
| --space-1 | 4px | Inline gaps |
| --space-2 | 8px | Tight controls |
| --space-3 | 12px | Table cell padding |
| --space-4 | 16px | Panel padding |
| --space-5 | 20px | Section header gap |
| --space-6 | 24px | Page block gap |
| --space-8 | 32px | Major area separation |

### Grid

- Max content width: 1180px.
- Desktop: two-column evidence layout when space allows.
- Mobile: single-column layout with no horizontal scroll.
- Breakpoints: mobile 375px, tablet 768px, desktop 1280px.

### Rules

- Prefer stable grids and tables over decorative cards.
- Fixed-format elements must not shift when labels change.
- All spacing values in generated HTML must use these tokens or multiples of 4px.

## 5. Components

### Wireframe Panel

- Structure: heading, optional helper text, content block or table.
- Variants: query, actions, results, states.
- Spacing: --space-4 internal, --space-6 between panels.
- States: default, hover, focus-visible.
- Accessibility: section headings, labelled controls, visible focus.
- Motion: none beyond hover/focus transitions.

### Evidence Table

- Structure: semantic table with header row and source/confidence columns.
- Variants: populated, empty.
- Spacing: --space-3 cell padding.
- States: row hover, focus-visible on interactive controls.
- Accessibility: column headers remain text, not icons.
- Motion: none.

## 6. Motion & Interaction

### Timing

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro | 120ms | ease-out | Button hover, focus outline |
| Standard | 180ms | ease-in-out | State visibility changes |

### Rules

- Animate only color, border-color, transform, or opacity.
- Every button and form control has hover and focus-visible states.
- Respect prefers-reduced-motion by keeping the page essentially static.

## 7. Depth & Surface

### Strategy

Use borders-only. Surfaces separate through border and tonal shift, not shadows.

| Type | Value | Usage |
|------|-------|-------|
| Default | 1px solid var(--border-default) | Panels and controls |
| Subtle | 1px solid var(--border-subtle) | Table rows and internal dividers |

No box shadows are used in generated wireframes.
