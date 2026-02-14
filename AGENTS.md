# AGENTS.md

Electron desktop app — React, TypeScript, Vite, MobX, Mantine UI.

## Architecture

Three-process Electron architecture with two TS project references:

- `src/main/` — Main process (Node.js). Tsconfig: `tsconfig.node.json`
- `src/preload/` — Preload scripts (bridge). Tsconfig: `tsconfig.node.json`
- `src/renderer/` — Renderer (React UI). Tsconfig: `tsconfig.web.json`

## Commands

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

## Code Style

Enforced by **@antfu/eslint-config** (`formatters: true`, `typescript: true`, `react: true`).
If you see an ESLint error, fix it through running `pnpm lint:fix` before making changes. Change code manually only if auto-fix can't handle it.

### Formatting

- **Double quotes**, **no semicolons**, **2-space indent** (spaces, not tabs)
- **LF** line endings, final newline required, trailing whitespace trimmed
- `console.log` is allowed (`"no-console": "off"`)
- No Prettier — formatting handled entirely by ESLint

### Imports

Separate type imports from value imports. Use `node:` protocol for Node built-ins. Use `@renderer/*` alias (maps to `src/renderer/src/*`) for renderer-internal imports:

```typescript
import type { RootStore } from "./RootStore"

import { join } from "node:path"
import { makeAutoObservable } from "mobx"
import { StoreProvider } from "@renderer/stores/StoreProvider"
```

### TypeScript

- Explicit return types on exported functions, especially `void`
- Use `!` non-null assertion only for well-known DOM elements (`document.getElementById("root")!`)
- Use `@ts-expect-error` with a reason (never `@ts-ignore`)
- Prefer `interface` for object shapes, `type` for unions/intersections

### Naming

| Kind                  | Convention  | Example                      |
|-----------------------|-------------|------------------------------|
| React components      | PascalCase  | `App.tsx`, `GoldStats.tsx`   |
| Store classes         | PascalCase  | `AppStore.ts`, `RootStore.ts`|
| Hooks                 | camelCase   | `useStores.ts`               |
| Variables / functions | camelCase   | `createWindow`, `getStores`  |
| Constants             | UPPER_CASE  | `FETCH_INTERVAL`             |
| IPC channels          | kebab-case  | `"stock:fetch-quote"`        |

### React Patterns

- Functional components only with `function` declarations and `React.JSX.Element` return type
- Wrap MobX-observed components with `observer()` and export the wrapped version:

```typescript
function GoldStats(): React.JSX.Element { /* ... */ }
const GoldStatsObserver = observer(GoldStats)
export default GoldStatsObserver
```

- Access stores via `useStores()` hook (throws if used outside `StoreProvider`)

### State Management (MobX)

Class-based stores with `makeAutoObservable`. Each store takes `RootStore` in constructor. Use `runInAction` for state updates after `await`:

```typescript
export class ExampleStore {
  constructor(private root: RootStore) {
    makeAutoObservable(this)
  }

  data: SomeType | null = null
  loading = false
  error: string | null = null

  async fetchData(): Promise<void> {
    this.loading = true
    this.error = null
    try {
      const result = await window.api.someMethod()
      runInAction(() => {
        this.data = result
        this.loading = false
      })
    }
    catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : "Failed to fetch"
        this.loading = false
      })
    }
  }
}
```

Stores are provided via React context with a singleton pattern in `useStores.ts`.

### Error Handling

- Use try/catch for IPC and async operations; log with `console.error`
- Guard clauses with descriptive `throw new Error(...)` for invalid state
- Catch/else/finally go on new lines (enforced by `.editorconfig`)

### Styling

- **Mantine** components for UI; use Mantine's theming system
- PostCSS with `postcss-preset-mantine` and `postcss-simple-vars`
- Inline `style` objects for simple one-off layouts
- No CSS Modules; use plain CSS files or Mantine's built-in styling

## Project Layout

```
src/
├── main/              # Main process (index.ts, database.ts, stocks.ts, gold.ts, etc.)
├── preload/           # Preload scripts (index.ts + index.d.ts for API types)
└── renderer/src/      # React UI
    ├── App.tsx, main.tsx, ThemedApp.tsx
    ├── assets/        # CSS files
    ├── components/    # React components (GoldStats, StocksTable, etc.)
    └── stores/        # MobX stores (RootStore, AppStore, GoldStore, etc.)
```
