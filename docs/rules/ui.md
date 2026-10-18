# UI Rules — Balik Baleno Design System

Read this file before building or modifying any UI. These rules describe the established visual language. New features must conform to it. Do not introduce new colors, fonts, radii, or component patterns without updating this document and asking first.

---

## 1. Design Tokens

### Color Palette

| Token | Value | Usage |
|---|---|---|
| `navy` | `#1b1a5f` | Primary text, borders on focus/hover, filled buttons, picked pills |
| `navy-hover` | `#2b2a78` | Primary button hover background |
| `terracotta` | `#a7513c` | Accent color — status dots, toggle-on state, destructive hover, focus ring, chip icon color |
| `cream-page` | `#f6f3e9` / `#fbf9f1` | Page background, card background |
| `cream-input` | `#fdfaf4` | Input field background |
| `cream-secondary-btn` | `#f4efe2` | Secondary button background |
| `cream-secondary-hover` | `#eae2d0` | Secondary button hover |
| `border-default` | `#dfdbce` | Card borders, dividers |
| `border-input` | `#c3cbe0` | Input field borders |
| `border-btn-secondary` | `#c8bda8` | Secondary/outline button borders |
| `border-chip` | `#d4cbb8` | Interest pill borders (unpicked) |
| `divider` | `#eaeadd` | Light horizontal dividers inside cards |
| `text-muted` | `#6b7385` | Subtitles, hints, helper text |
| `text-secondary` | `#8c93a3` | Chevrons, placeholders, lighter labels |
| `success` | `#276738` | Inline success feedback text |
| `error` | `#a7513c` | Inline error feedback text (same as terracotta) |
| `white` | `#ffffff` | Chip/pill backgrounds, card insets |
| `destructive-bg` | `#fdf5f3` | Remove button background |
| `destructive-border` | `#e2c0b8` | Remove button border |

### Never Use

- Raw cold grays: `#ddd`, `#f2f2f0`, `#1f1a17`, `#999`, `#333`
- Pure black (`#000`) or pure white only for text
- Any blue not from the `navy` family
- New colors without updating this table

---

## 2. Typography

| Element | Font | Size | Weight | Notes |
|---|---|---|---|---|
| Card / section headings (`h2`) | Fraunces, serif | `1.5rem` | `600` | `letter-spacing: -0.02em` |
| Smaller headings (`h3`) | Fraunces, serif | `1.15rem` | `600` | Used in photo slot headers |
| Body / paragraph | Inherited site font | `1rem` | `400` | |
| Labels (`.field`) | Inherited | `0.85rem` | `600` | Navy color |
| Hints (`.field-hint`) | Inherited | `0.825rem` | `400` | Muted color `#6b7385` |
| Subtitle / lead | Inherited | `0.875–0.95rem` | `400` | Muted color `#6b7385` |
| Category group names | Inherited | `0.85rem` | `700` | All-caps, `letter-spacing: 0.04em` |
| Badge text | Inherited | `0.75rem` | `600` | Pill-shaped labels |
| Button text | Inherited | `0.85–0.9rem` | `600` | |
| Chip text | Inherited | `0.875rem` | `600` | |

---

## 3. Cards

A **card** is a grouped content section on a page.

```
background: #fbf9f1
border: 1px solid #dfdbce
border-radius: 16px
padding: 28px 24px
box-shadow: 0 4px 14px rgba(27, 26, 95, 0.03)
```

- On `:hover`, border transitions to `#cbbeaa`.
- Card header (`h2`) sits below a bottom divider (`border-bottom: 1px solid #eaeadd`).
- Use `.card-feedback` for inline save/error messages per card — do **not** surface a single top-of-page status string as the only feedback.
  - Success: `color: #276738`
  - Error: `color: #a7513c`

---

## 4. Buttons

All clickable actions that are **not links** must use the tactile button system. Never use a plain unstyled `<button>` or an `<a>` styled to look like text for primary actions.

### Base (`.button`)

```css
display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
font-weight: 600; border-radius: 8px; cursor: pointer; user-select: none;
transition: transform 0.1s ease, background-color 0.15s, border-color 0.15s, box-shadow 0.15s, opacity 0.15s;
```

- `:hover` → `transform: translateY(-1.5px)` (lift)
- `:active` → `transform: scale(0.97)` (press)
- `:focus-visible` → `outline: 2px solid #a7513c; outline-offset: 2px`
- `.is-saving` → `opacity: 0.7; pointer-events: none; transform: none`

### Variants

| Class | Background | Border | Color | Use when |
|---|---|---|---|---|
| `.button-primary` | `#1b1a5f` | `#1b1a5f` | `#ffffff` | Primary save/submit action per card |
| `.button-secondary` | `#f4efe2` | `#c8bda8` | `#1b1a5f` | Secondary / neutral actions |
| `.button-outline` | `#ffffff` | `#c8bda8` | `#1b1a5f` | Tertiary / ghost actions |
| `.button-remove` / `.photo-remove` | `#fdf5f3` | `#e2c0b8` | `#a7513c` | Destructive actions (delete, remove) |

Each card should have **one** `.button-primary`. Supporting actions use `.button-secondary` or `.button-outline`.

### Loading State

When a form submits:
1. Disable the button.
2. Add `.is-saving`.
3. Change text to a gerund ("Saving…", "Sending…").
4. Restore on resolve/reject.

---

## 5. Form Fields

```
.field label: navy, 0.85rem, font-weight 600
input/select/textarea:
  background: #fdfaf4; border: 1px solid #c3cbe0; border-radius: 8px; padding: 10px 12px
  focus: border-color #1b1a5f; box-shadow: 0 0 0 3px rgba(27,26,95,0.1)
```

- Use `.field-hint` for helper text below inputs (`#6b7385`, `0.825rem`).
- Multi-column layouts use `.field-row` with `flex: 1 1 12rem` per `.field`.

---

## 6. Toggle Switches

**Never use a raw `<input type="checkbox">` for a boolean preference.** Use the accessible toggle pattern:

```html
<label class="toggle-switch">
  <input type="checkbox" class="toggle-input" />
  <span class="toggle-slider"></span>
  <span class="toggle-label">
    <strong>Label</strong>
    <span>Optional description</span>
  </span>
</label>
```

- Off track: `#dfdbce`
- On track: `#a7513c` (terracotta)
- Thumb: `#ffffff`, 20×20px, `box-shadow: 0 1px 3px rgba(0,0,0,0.2)`
- Track size: `44px × 24px`, `border-radius: 999px`
- Focus ring: `0 0 0 3px rgba(167,81,60,0.25)` on `:focus-visible`
- `translateX(20px)` on `:checked`

---

## 7. Interest / Option Pills (`.chip`)

Used for any multi-select tag or category option the member can toggle.

```css
display: inline-flex; align-items: center; gap: 0.45rem;
padding: 0.45rem 1rem; border: 1.5px solid #d4cbb8; border-radius: 999px;
background: #ffffff; color: #1b1a5f; font-size: 0.875rem; font-weight: 600;
cursor: pointer; box-shadow: 0 2px 4px rgba(27,26,95,0.04);
transition: all 0.15s cubic-bezier(0.4,0,0.2,1); user-select: none; white-space: nowrap;
```

### States

| State | Background | Border | Color |
|---|---|---|---|
| Default (unpicked) | `#ffffff` | `#d4cbb8` | `#1b1a5f` |
| `:hover` | `#f7f3e8` | `#1b1a5f` | `#1b1a5f` + `translateY(-1.5px)` |
| `:active` | — | — | `scale(0.96)` |
| `.is-picked` | `#1b1a5f` | `#1b1a5f` | `#ffffff` |
| `.is-picked:hover` | `#a7513c` | `#a7513c` | `#ffffff` |

### Anatomy

Every chip must have two child spans:
- `.chip-icon` — `aria-hidden="true"`, shows `"+"` (unpicked) or `"✓"` (picked). Color: `#a7513c` unpicked, `#ffffff` picked.
- `.chip-text` — the label text.

### Grouping (Collapsible Categories)

Group chips inside a `<details class="interest-shelf-group">`:
- `<summary class="interest-group-summary">` with:
  - `.interest-group-title-box` → `.interest-group-chevron` SVG + `.interest-group-name` (all-caps)
  - `.interest-group-badge` — shows `"N picked"` (navy fill) or `"N options"` (cream fill)
- `<div class="interest-chips">` for the chips (inside the `<details>`)
- `[open]` state: navy border, deeper shadow, chevron rotates 180°
- On first render: auto-open categories that have picks, plus the first category as default.
- Persist open/closed state across re-renders using a `Set<string>` of open group names.

> **Astro scoping note:** Chips and collapsible groups are built with `document.createElement()` at runtime. Their styles **must** live in `<style is:global>`, not the regular `<style>` block, or Astro's scoped attribute will not be applied to dynamically created elements.

---

## 8. Navigation Pills (`.studio-nav-pill`)

Section anchor tabs inside a sticky sub-nav bar.

```
padding: 0.35rem 0.85rem; border-radius: 999px; background: #fbf9f1;
border: 1px solid #dfdbce; color: #1b1a5f; font-size: 0.85rem; font-weight: 500;
white-space: nowrap; transition: all 0.15s ease;
hover → background: #1b1a5f; color: #fbf9f1; border-color: #1b1a5f;
```

Sticky bar: `top: 60px; z-index: 20; background: rgba(246,243,233,0.92); backdrop-filter: blur(10px); border-bottom: 1px solid #dfdbce`.

---

## 9. Photo Frames

| Variant | Shape | Size / Ratio |
|---|---|---|
| Cover photo | Rectangle, `border-radius: 12px` | `aspect-ratio: 1600/640`, max-height `240px` |
| Profile avatar | Rounded square, `border-radius: 20px` | `7.5rem × 7.5rem` |
| Batch-era avatar | Same as profile avatar | Same |
| Gallery slot | Square, `border-radius: 4px` | `aspect-ratio: 1` |

- Empty state: `border: 2px dashed #dfdbce; background: #f8f5ec`. Pseudo `::after { content: "No photo yet" }`.
- Filled state: border becomes solid `#dfdbce`.

---

## 10. Feedback & Status

- **Per-card feedback** (`.card-feedback`): inline, below form actions. Success `#276738`, error `#a7513c`.
- **Global status bar** (`#profile-status`): used only for top-level page messages. Prefer per-card feedback for form saves.
- **Status banner**: `#fbf9f1` background, `#dfdbce` border, `border-radius: 12px`. Status dot is `#a7513c`, `8px` circle.

---

## 11. Layout

- Max content width for studio/form pages: `760px`.
- Gaps between cards: `2rem` (`margin-top: 2rem`).
- Use `scroll-margin-top: 110px` on anchored cards so sticky nav doesn't overlap.
- Page background: `#f6f3e9` / `#fbf9f1` warm cream — never white or cold gray.

---

## 12. Scoped vs Global Styles

| Situation | Use |
|---|---|
| Static HTML rendered by Astro at build/request time | `<style>` (scoped, default) |
| Elements created via `document.createElement()` at runtime | `<style is:global>` |

Mixing these incorrectly is a common bug. If a class is only ever on static markup, keep it scoped. If JavaScript ever creates an element with that class, it must be global.

---

## 13. Layout / Chrome Rules

- **Header** is sticky. Announcement strip scrolls away.
- **Footer** must always carry the unofficial-site disclaimer.
- Do not change the header or footer layout, font, or spacing without being explicitly asked.

---

## 14. What Needs Approval Before Changing

- Any new color not listed in §1
- Any new font family
- Any change to header or footer
- Any removal or replacement of an existing component pattern
- Any change to the sticky-header offset (`top: 60px`) used by the sub-nav

