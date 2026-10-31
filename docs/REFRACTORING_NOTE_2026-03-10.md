# Signal Ayu Unified Refactoring Note (2026-03-10)

## Scope and policy
- Keep Tistory skin placeholder structure and rendering flow intact.
- Keep current Ayu visual identity and dark-first policy.
- Improve maintainability with minimal behavior change.
- Keep project uploadable as a plain Tistory skin ZIP.

## JavaScript architecture
### What stays inline
- `skin.html` head inline bootstrap stays:
  - Reads `localStorage.theme` if available.
  - Sets `html[data-theme]` before paint to reduce first-load flash.
- This remains inline intentionally because it must run before external scripts.

### What moved to external JS
- Theme toggle runtime logic moved into `images/script.js` as `window.SignalAyuTheme`:
  - Theme toggle click binding.
  - Theme apply + `localStorage` persistence.
  - Toggle button icon/label sync.
  - `aria-pressed` state sync.
- Existing interactions (menu/profile/category/search/comment init) are preserved.

## CSS organization
- Existing single-file structure is preserved for packaging safety.
- Added top-level section guide comment to clarify:
  - base/reset + default layout
  - Ayu theme extension
  - icon/component patches
  - responsive section
- Reduced broad typography override risk:
  - Replaced dark-mode `.article-view *` font force with targeted content tags.
  - Kept code font override rules unchanged.

## Asset review
- Correction (2026-10-31): `images/font.css` remains in the repository and is referenced by `skin.html`. The earlier removal statement was inaccurate. Keep the asset until its font usage is reviewed.

## Intentionally not changed
- No Tistory placeholder renaming/removal.
- No layout or template block restructuring.
- No build tooling/package manager migration.
- No default theme policy change (still dark-first + saved preference).

## Migration summary
- Removed bottom inline theme toggle script from `skin.html`.
- Added `window.SignalAyuTheme` module in `images/script.js`.
- Added `aria-pressed` sync for theme toggle accessibility.
- Narrowed dark-mode article typography selector scope in `style.css`.
