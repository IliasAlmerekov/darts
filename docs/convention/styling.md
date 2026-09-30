# Styling

Rules for CSS, CSS Modules, design tokens, class composition, and responsive styling.
Source-of-truth: must be checked against `src/` before changing.

## Layout

```
src/app/styles/index.css        # global fonts, tokens, base element styles
src/app/*.module.css            # app-level component styles
src/pages/**/<Name>.module.css  # page and page-private component styles
src/shared/ui/**/<Name>.module.css # reusable UI component styles
```

Rules:

- Use CSS Modules for component and page styles.
- Keep CSS Modules co-located with the component, page, or UI folder that owns them.
- Do not add non-module CSS files outside `src/app/styles/index.css`.
- Do not import CSS Modules across page or UI ownership boundaries.
- Reuse a CSS Module across sibling components only when they are one visual unit
  (`Keyboard.module.css`, `GamePlayerItem.module.css`).

## Global stylesheet

`src/app/styles/index.css` owns global styling only:

- `@font-face` declarations.
- `:root` design tokens.
- `html`, `body`, and `#root` base layout.
- Base heading typography (`h1`...`h5`).
- Legacy global utility classes already present there (`copylarge`, `copydefault`,
  `copysmall`, `overflow-hidden`).

Rules:

- Put new tokens in `:root`, not in component modules.
- Do not add page-specific selectors to `index.css`.
- Do not add global utility classes unless at least two unrelated areas already need them.
- Do not use `:global` from CSS Modules.

## Design tokens

The token system lives in `:root`:

- Typography: `--font-family-base`, `--font-size-*`, `--line-height-*`,
  `--font-weight-*`.
- Colors: `--white`, `--lightgrey`, `--middlegrey`, `--darkgrey`, `--red`, `--blue`,
  `--oxfordblue`, `--darkblue`, plus semantic aliases `--color-*`.
- Spacing: `--padding-*`, `--space-*`, `--page-padding`, `--panel-padding`,
  `--card-padding`.
- Shape and effects: `--radius-*`, `--box-shadow`, `--shadow-elev-1`,
  `--transition-*`.
- Fixed interaction sizes: `--button-height`, `--nav-height`.

Rules:

- Use existing tokens for spacing, typography, colors, radii, shadows, and transitions.
- Add a new token only when the value is reused or belongs to the design system.
- Keep one-off geometry values local to the module that needs them.
- Raw colors are allowed only for alpha overlays, gradients, skeletons, focus rings, or
  legacy status colors; prefer tokens for new solid UI colors.

## CSS Modules

Rules:

- Import CSS Modules as `styles` in production code:

  ```ts
  import styles from "./Button.module.css";
  ```

- Tests may import multiple modules with descriptive aliases (`cardStyles`,
  `podiumStyles`) when asserting class names.
- Reference classes through `styles.className`.
- Do not write global string classes in JSX (`className="button"`).
- Use `clsx(...)` for conditional classes and for combining external `className` props.
- Avoid new template-string class concatenation; existing auth forms are legacy.
- Do not depend on generated CSS Module class names.

## Class names

The codebase mostly uses camelCase local classes, but stylelint intentionally does not
enforce a selector pattern because legacy lowercase names exist (`copylarge`) and some
third-party layout classes were migrated into modules.

Rules:

- Prefer camelCase for new module classes.
- Use domain names that describe role, not element type alone (`playerRow`, not `row`).
- Keep state classes local and explicit (`active`, `finished`, `buttonActive`).
- Do not introduce BEM-style `__` or `--` class names.
- Do not use kebab-case for new local classes.

## Responsive CSS

Reality in `src/` uses CSS media queries directly inside modules:

- `@media (width <= 600px)` for mobile.
- `@media (width <= 768px)` for tablet/mobile adjustments.
- `@media (width > 600px) and (width <= 1024px)` for tablet-specific layout.
- `@supports (height: 100dvh)` for browser capability adjustments.

Rules:

- Put responsive overrides in the same CSS Module as the base class.
- Use range media syntax (`width <= 600px`), matching existing files.
- Use `clamp(...)` for tokenized responsive spacing, font sizes, and fixed controls.
- Keep layout containers stable with explicit gaps, padding, min/max sizes, or aspect
  constraints when content can change.

## Inline styles

Inline styles are rare and reserved for runtime-computed values:

- Slider width/transform based on option count and active index.
- Drag-and-drop transform/transition/opacity from `@dnd-kit`.

Rules:

- Do not use inline styles for colors, spacing, typography, borders, or shadows.
- Use inline styles only when the value is calculated at runtime and cannot be expressed
  by selecting a CSS Module class.
- Keep inline style objects small and local to the component that owns the runtime value.

## Motion and layering

Rules:

- Define `@keyframes` in the CSS Module that uses the animation.
- Use `@media (prefers-reduced-motion: reduce)` when motion is continuous or decorative.
- Keep overlays on the established z-index layer (`2000`) unless a lower local layer is
  enough.
- Use `position: fixed` only for overlays, mobile navigation, and skeleton/full-screen
  loading states.
- Avoid `!important`; existing hits are legacy overrides for mobile buttons and shared
  overview item width.

## Tooling

Stylelint is configured in `.stylelintrc.json` with `stylelint-config-standard`.

Rules:

- Run `npm run stylelint` after editing CSS.
- Do not weaken `.stylelintrc.json` to fit a new selector or syntax.
- Do not add generated CSS output to `src/`.

## Verification

Stylelint catches syntax and standard CSS issues. These greps cover project-specific
styling boundaries:

**1. No non-module CSS imports outside app bootstrap**:

```bash
rg -n '^import .*\.css' src --glob '*.{ts,tsx}' --glob '!src/index.tsx' --glob '!src/app/App.tsx' | rg -v '\.module\.css'
```

**2. No global string classes in JSX**:

```bash
rg -n 'className="[A-Za-z]' src --glob '*.tsx'
```

**3. No CSS Modules imported from another owner via alias/deep path**:

```bash
rg -n 'from "@/.*\.module\.css"' src/pages src/shared
```

A clean run of all three prints nothing.
