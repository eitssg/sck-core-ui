---
title: UI Header and Typography Style Guide (SCK Core UI)
version: 1.1
last_updated: 2025-09-14
purpose: Canonical, machine-readable rules for page and section headings, subtitles, and actions in sck-core-ui. Keeps humans and AI in sync.
---

# UI Header and Typography Style Guide

This style guide standardizes page headers, section titles, subtitles, and related actions across the app. It defines the visual hierarchy, exact components/props to use, and a machine-readable contract to avoid ambiguity.

## TL;DR

- Dashboard pages use `DashboardLayout` with `pageTitle`/`pageSubtitle`; do not render local h1/h2 inside content.
- Create pages are single-card forms; do not use `DashboardLayout`. Title is in `CardHeader > CardTitle`; footer has Cancel (neutral) and Save (primary); avoid a back arrow when Cancel exists.
- New pages default to create (single-card form) unless specified otherwise.
- On very narrow mobile devices, the header should reduce in size to be displayed fully to a minimum of the page font size, then ellipsis.
- Inside page content, use shadcn `CardHeader > CardTitle` for section titles and `CardDescription` for subtitles.
- Tabs follow the same pattern inside each `TabsContent`: section cards with `CardTitle`/`CardDescription`.
- Action buttons in page headers are subtle (ghost/outline, size sm) and right-aligned within the page content’s first row, not inside the global header bar.
- Primary/blue buttons are reserved for forms (Save/Submit), dialogs, and auth flows (e.g., Login/Submit). List/navigation actions use neutral buttons.

## Visual Hierarchy

1) **Dashboard Page Header** (via `DashboardLayout`)
   - Title: provided by `pageTitle` prop (class: `sck-page-title`)
   - Subtitle: provided by `pageSubtitle` prop (class: `sck-page-subtitle`)
   - Where: Top sticky header bar, left side. No custom H1/H2 in pages.

2) **Create Page Header** (single-card form)
  - Title: in the form card’s header using `CardHeader > CardTitle` (class: `sck-section-title`)
  - Subtitle (optional): `CardDescription` (class: `sck-section-subtitle`)
  - Where: Inside a single centered `Card` (e.g., `mx-auto max-w-lg md:max-w-xl`). Do not use `DashboardLayout`.

3) **Page Content Action Row** (optional)
   - Right-aligned subtle actions (e.g., New, Edit) using `Button variant="ghost" size="sm"` with `text-muted-foreground`.
   - Lives inside the page content area, typically immediately under the global header.

4) **Section Headers** (within content)
   - Use `<CardHeader><CardTitle className="sck-section-title">…</CardTitle><CardDescription className="sck-section-subtitle">…</CardDescription></CardHeader>`.
   - Section title scale: rely on component defaults (do not override to 3xl); keep consistent.

5) **Tabs Content**
   - For each tab, prefer section cards with `CardTitle` and `CardDescription`.
   - Optional: use `sck-tab-title` and `sck-tab-subtitle` on tab-local headings (scoped to a single `TabsContent` panel) when not using a Card.
   - Avoid additional page-level titles in tabs (spanning multiple tabs); tabs label the area, cards title the sections.

6) **In-content Entity Headings** (labels/rows)
   - Use smaller text (default or `text-sm`) as needed; avoid large headers.

## Type Scale

Use shadcn defaults for consistency; extend via `theme.css` if needed.

| Element          | Class                  | Size                  | Weight     | Use Case                  |
|------------------|------------------------|-----------------------|------------|---------------------------|
| Page Title       | `sck-page-title`       | `text-2xl md:text-3xl` | `font-semibold` | Global headers            |
| Section Title    | `sck-section-title`    | `text-lg`             | `font-medium`  | Cards/tabs                |
| Tab Title        | `sck-tab-title`        | `text-lg`             | `font-medium`  | Tab-local headings        |
| Subtitle/Description | `sck-page-subtitle`, `sck-section-subtitle`, `sck-tab-subtitle` | `text-sm md:text-base` | `font-normal` | Supporting text           |
| Body Text        | Default                | `text-base`           | `font-normal` | Content paragraphs        |
| Labels           | `text-sm`              | `text-sm`             | `font-medium` | Form fields, rows         |

- Line height: Default `leading-relaxed` unless compact (e.g., lists: `leading-tight`).
- Color: Foreground default; muted for subtitles/labels via `text-muted-foreground`.

## Responsiveness and Edge Cases

- **Mobile**: Subtitles truncate at 1 line (`truncate` class); actions stack vertically in `flex-col sm:flex-row`. Use responsive sizes (e.g., `text-xl sm:text-2xl` for titles).
- **Empty States**: Retain `pageTitle`; set `pageSubtitle` to actionable prompt (e.g., "No data yet—click New to start").
- **Errors**: Append error context to subtitle (e.g., "Applications (Failed to load)"); use neutral warning icons in action row.
- **Breadcrumbs**: If hierarchical nav needed (e.g., Portfolio > App), add as left-aligned in content action row (e.g., `<Breadcrumb>` before title); do not override global header.
- **Overrides**: Avoid for core elements; for exceptions (e.g., bold warnings), prefix class with `!important` and document in PR.

## Machine-readable Contract

```json
{
  "header_system": {
    "global": {
      "component": "DashboardLayout",
      "props": ["pageTitle", "pageSubtitle"],
      "title_class": "sck-page-title",
      "subtitle_class": "sck-page-subtitle",
      "no_local_h1": true,
      "applies_to": "dashboard_pages_only"
    },
    "create_page": {
      "no_dashboard_layout": true,
      "container": { "component": "Card", "classes": ["mx-auto", "max-w-lg", "md:max-w-xl"] },
      "header": {
        "component": "CardHeader",
        "title": "CardTitle",
        "subtitle": "CardDescription",
        "title_class": "sck-section-title",
        "subtitle_class": "sck-section-subtitle"
      },
      "footer_actions": {
        "cancel_variant": ["ghost", "secondary"],
        "save_variant": "primary",
        "no_back_arrow_when_cancel": true,
        "destructive_variant": "destructive"
      }
    },
    "actions": {
      "placement": "content_header_row_right",
      "button": {
        "variant": { "default": "ghost", "alternatives": ["outline", "secondary"] },
        "size": ["sm", "icon"],
        "tone": "muted"
      },
      "icon_size_px": 16,
      "accessibility": { "aria_label_required_for_icon_only": true },
      "primary_usage": "forms_dialogs_auth_only"
    },
    "sections": {
      "component": "CardHeader",
      "title": "CardTitle",
      "subtitle": "CardDescription",
      "title_class": "sck-section-title",
      "subtitle_class": "sck-section-subtitle",
      "avoid_overrides": true
    },
    "tabs": {
      "inside_tab": "use_section_cards",
      "title_class": "sck-tab-title",
      "subtitle_class": "sck-tab-subtitle",
      "avoid_page_level_titles": true,
      "tab_local_definition": "scoped_to_single_TabsContent_panel"
    }
  },
  "typography": {
    "scale": {
      "page_title": { "size": "text-2xl md:text-3xl", "weight": "semibold" },
      "section_title": { "size": "text-lg", "weight": "medium" },
      "tab_title": { "size": "text-lg", "weight": "medium" },
      "subtitle": { "size": "text-sm md:text-base", "weight": "normal" },
      "body": { "size": "text-base", "weight": "normal" },
      "label": { "size": "text-sm", "weight": "medium" }
    },
    "responsiveness": {
      "mobile_truncate_subtitle": true,
      "stack_actions_below_768px": true
    }
  },
  "edge_cases": {
    "empty_state": { "use_page_subtitle_for_cta": true },
    "errors": { "header_fallback": "use_page_title_with_error_suffix" },
    "breadcrumbs": { "placement": "content_header_row_left", "component": "Breadcrumb" }
  }
}