# Styling

Rules for CSS, CSS Modules, design tokens, class composition, and responsive styling.

## Layout

```
src/app/styles/index.css            # the only non-module stylesheet: fonts, tokens, base elements
src/app/**/<Name>.module.css        # app shell and route components (App, ErrorBoundary, routes/)
src/pages/**/<Name>.module.css      # page and page-private component styles
src/shared/ui/**/<Name>.module.css  # reusable UI component styles
```

Rules:

- Use CSS Modules for component and page styles, co-located with the component, page, or
  UI folder that owns them.
- Add non-module CSS only to `src/app/styles/index.css`. It is imported by the bootstrap
  files `src/index.tsx` and `src/app/App.tsx` only.
- Import a CSS Module only from its own folder. In pages and shared UI that is
  `./<Name>.module.css`; a `../` or `@/` import crosses an ownership boundary.
- Share one CSS Module between sibling components only when they are one visual unit
  (`Keyboard.module.css` for `Keyboard` and `NumberButton`; `GamePlayerItem.module.css`
  for the player item and its lists).

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
- Keep page-specific selectors out of `index.css`.
- Add a global utility class only when at least two unrelated areas already need it.
- Keep CSS Modules local: no `:global`.

## Design tokens

The token system lives in `:root` of `index.css`; read it for the exact names:

- Typography: `--font-family-base`, `--font-size-*`, `--line-height-*`,
  `--font-weight-*`, `--letter-spacing-tight`.
- Colors: `--white`, `--lightgrey`, `--middlegrey`, `--darkgrey`, `--red`, `--green`,
  `--blue`, `--oxfordblue`, `--darkblue`, plus semantic aliases `--color-*`.
- Spacing: `--padding-*`, `--space-*`, `--page-padding`, `--panel-padding`,
  `--card-padding`.
- Shape and effects: `--radius-*`, `--box-shadow`, `--shadow-elev-1`,
  `--transition-*`.
- Fixed interaction sizes: `--button-height`, `--nav-height`.

Rules:

- Add a new token only when the value is reused or belongs to the design system. Keep
  one-off geometry values local to the module that needs them.
- Raw colors are allowed only for alpha overlays, gradients, skeletons, focus rings, or
  legacy status colors. New solid UI colors use tokens.

## CSS Modules

Rules:

- Import CSS Modules as `styles` in production code:

  ```ts
  import styles from "./Button.module.css";
  ```

- Tests may import several modules with descriptive aliases (`cardStyles`,
  `podiumStyles` in `src/shared/ui/podium/Podium.test.tsx`) when asserting class names.
- Reference classes through `styles.className`; JSX carries no global string classes
  (`className="button"`).
- Use `clsx(...)` for conditional classes and for combining external `className` props.
  The template-string concatenation in the login and register forms is legacy.
- Do not depend on generated CSS Module class names.

## Class names

Stylelint does not enforce a selector pattern (`selector-class-pattern: null`), because
legacy lowercase names (`copylarge`) and migrated third-party layout classes exist.

Rules:

- Use camelCase for new module classes; no BEM `__`/`--` and no kebab-case.
- Name classes by role, not element type alone (`playerRow`, not `row`).
- Keep state classes local and explicit (`active`, `finished`, `buttonActive`).

## Responsive CSS

Media queries live inside the module that owns the base class. There is no shared
breakpoint scale: `width <= 600px` (mobile) is by far the most common, followed by
`width <= 768px` and `width > 600px and width <= 1024px`; other widths exist where a
layout needed them. Stylelint enforces range syntax (`width <= 600px`).

Rules:

- Put responsive overrides in the same CSS Module as the base class.
- Use `clamp(...)` for tokenized responsive spacing, font sizes, and fixed controls.

## Inline styles

Inline styles hold runtime-computed values only, and only when no CSS Module class can
express them. Current uses:

- Slider width/transform from option count and active index (`SettingsTabs`,
  `SettingsGroupBtn`).
- Drag-and-drop transform/transition/opacity from `@dnd-kit` (`SelectedPlayerItem`).

Colors, spacing, typography, borders, and shadows stay in CSS Modules.

## Motion and layering

Rules:

- Define `@keyframes` in the CSS Module that uses the animation.
- Full-screen fixed overlays sit on `z-index: 2000` (`Overlay`, `SettingsOverlay`,
  `Game`). Everything else uses small local layers (`0`, `1`, `15`). The `1000` on
  `QRCode.module.css` `.qrCodeOverlay` has no positioning and so no effect.
- Use `position: fixed` only for overlays, mobile navigation, and full-screen
  loading or skeleton states.
- `!important` exists only as legacy overrides for StartPage mobile buttons and the
  shared overview item width; new code wins on specificity instead.

## Tooling

Stylelint is configured in `.stylelintrc.json` with `stylelint-config-standard`. Run
`npm run stylelint` after editing CSS. Fix the CSS rather than loosening
`.stylelintrc.json` for a new selector or syntax.

## Verification

Stylelint catches syntax and standard CSS issues. These checks cover project-specific
styling boundaries; a clean run of all five prints nothing.

**1. No non-module CSS files besides `index.css`**:

```bash
rg --files src -g '*.css' -g '!*.module.css' -g '!src/app/styles/index.css'
```

**2. No non-module CSS imports outside app bootstrap**:

```bash
rg -n '^import .*\.css' src --glob '*.{ts,tsx}' --glob '!src/index.tsx' --glob '!src/app/App.tsx' | rg -v '\.module\.css'
```

**3. No global string classes in JSX**:

```bash
rg -n "className=\{?[\"'][A-Za-z]" src --glob '*.tsx'
```

**4. No CSS Module imported from another folder**:

```bash
rg -n 'from "(@/|\.\./)[^"]*\.module\.css"' src/pages src/shared
```

`src/app/` files import their own modules through `@/app/...`, so the check skips `src/app/`.

**5. No `:global` in CSS Modules**:

```bash
rg -n ':global' src --glob '*.module.css'
```
