# AGENTS.md

This is an Electron desktop application built with React, TypeScript, Vite, MobX, and Mantine UI.

## Architecture

Three-process Electron architecture:

- `src/main/` — Main process (Node.js/Electron)
- `src/preload/` — Preload scripts (bridge between main and renderer)
- `src/renderer/` — Renderer process (React UI)

Two separate TypeScript project references:

- `tsconfig.node.json` — Main + Preload (Node context)
- `tsconfig.web.json` — Renderer (Web/React context)

## Build / Lint / Typecheck Commands

Package manager: **pnpm** (v10.28.2), Node 22.

```bash
pnpm dev              # Start dev server (electron-vite dev)
pnpm build            # Typecheck + build (electron-vite build)
pnpm lint             # ESLint with cache
pnpm lint:fix         # ESLint with auto-fix
pnpm typecheck        # Run both node and web typechecks
pnpm typecheck:node   # tsc --noEmit -p tsconfig.node.json --composite false
pnpm typecheck:web    # tsc --noEmit -p tsconfig.web.json --composite false
```

## Testing

**Vitest** with two projects configured in `vitest.config.ts`:

- **renderer** — `jsdom` environment, includes `src/renderer/**/*.test.{ts,tsx}`
- **main** — `node` environment, includes `src/main/**/*.test.ts`

```bash
pnpm test                    # Run all tests once
pnpm test:watch              # Watch mode
pnpm test:renderer           # Renderer tests only
pnpm test:main               # Main-process tests only
pnpm vitest run path/to/file.test.ts   # Single file
pnpm vitest run -t "test name"         # Single test by name
```

### Conventions

- **MobX stores** are plain classes — test them directly without DOM or React rendering.
- **Renderer components** use `@testing-library/react`; `jest-dom` matchers are available via setup.
- **Main-process tests** mock `electron` with `vi.mock("electron", () => import("../../test/__mocks__/electron"))`.
- `describe` block names must start with **lowercase** (ESLint `test/prefer-lowercase-title`).
- Test files live next to the source: `AppStore.ts` → `AppStore.test.ts`.

## Code Style

Enforced by **@antfu/eslint-config** with `formatters: true`, `typescript: true`, `react: true`.

### Formatting

- **Double quotes** everywhere (configured in ESLint stylistic)
- **2-space indentation**, spaces not tabs
- **LF** line endings
- **No semicolons** (antfu default)
- Final newline required, trailing whitespace trimmed
- `console.log` is allowed (`"no-console": "off"`)
- No standalone Prettier config — formatting is handled by ESLint

### Imports

Separate type imports from value imports:

```typescript
import type { PropsWithChildren } from "react"
import type { RootStore } from "./RootStore"

import { createContext, use } from "react"
import { MantineProvider } from "@mantine/core"
```

Use `node:` protocol for Node.js built-ins:

```typescript
import { join } from "node:path"
```

Use path alias for renderer-internal imports:

```typescript
import { StoreProvider } from "@renderer/stores/StoreProvider"
```

`@renderer/*` maps to `src/renderer/src/*`.

### TypeScript

- Explicit return types on exported functions, especially `void`:

```typescript
function createWindow(): void { ... }
```

- Use `!` non-null assertion only for well-known DOM elements:

```typescript
createRoot(document.getElementById("root")!)
```

- Use `@ts-expect-error` (not `@ts-ignore`) with a reason when suppression is needed:

```typescript
// @ts-expect-error ts(2551)
window.electron = electronAPI
```

- Prefer interfaces for object shapes, `type` for unions/intersections.

### Naming Conventions

| Kind                  | Convention  | Example                    |
|-----------------------|-------------|----------------------------|
| React components      | PascalCase  | `App.tsx`, `Versions.tsx`  |
| Component files       | PascalCase  | `StoreProvider.tsx`        |
| Store classes         | PascalCase  | `AppStore.ts`, `RootStore.ts` |
| Hooks                 | camelCase   | `useStores.ts`             |
| Variables / functions | camelCase   | `createWindow`, `getStores`|
| Constants             | UPPER_CASE  | `DEFAULT_WIDTH`            |
| Config files          | kebab-case  | `electron.vite.config.ts`  |

### React Patterns

- Functional components only, with explicit `React.JSX.Element` return type:

```typescript
function App(): React.JSX.Element {
  return <MantineProvider>...</MantineProvider>
}
export default App
```

- Use `function` declarations for components (not arrow functions).
- Hooks for state and side effects; no class components.

### State Management (MobX)

Class-based stores with `makeAutoObservable`:

```typescript
export class AppStore {
  constructor(private root: RootStore) {
    makeAutoObservable(this)
  }

  initialized = false

  setInitialized(value: boolean): void {
    this.initialized = value
  }

  get isReady(): boolean {
    return this.initialized
  }
}
```

Stores are provided via React context with a singleton pattern:

```typescript
let stores: RootStore | null = null
export function getStores() {
  stores = stores || new RootStore()
  return stores
}
```

Access stores in components via `useStores()` hook. The hook throws if used outside the provider.

### Error Handling

- Use try/catch for Electron IPC and context bridge operations; log with `console.error`.
- Use guard clauses with descriptive `throw new Error(...)` for invalid state:

```typescript
if (!ctx) {
  throw new Error("useStores must be used within a StoresProvider.")
}
```

- Catch/else/finally go on new lines (enforced by .editorconfig for TS/TSX).

### Styling

- **Mantine** components for UI; use Mantine's theming system.
- PostCSS with `postcss-preset-mantine` and `postcss-simple-vars` for breakpoints.
- Inline `style` objects for simple one-off layouts.
- No CSS Modules; use plain CSS files or Mantine's built-in styling.

## Project Layout

```
src/
├── main/              # Electron main process
│   └── index.ts
├── preload/           # Preload scripts
│   ├── index.ts
│   └── index.d.ts
└── renderer/          # React UI
    ├── index.html
    └── src/
        ├── App.tsx
        ├── main.tsx
        ├── assets/
        ├── components/
        └── stores/
            ├── RootStore.ts       # Root store
            ├── AppStore.ts        # Feature store
            ├── StoreProvider.tsx   # React context provider
            └── useStores.ts       # Hook + context definition
```

## Tooling

- **electron-vite** for dev server and production builds
- **pnpm** as package manager (lockfile committed)
- **mise** for tool version management (node, pnpm, opencode)
- **VSCode** recommended with `dbaeumer.vscode-eslint` extension
