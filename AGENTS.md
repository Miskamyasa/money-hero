# AGENTS.md

Electron desktop app — React, TypeScript, Vite, MobX, Mantine UI.

## Architecture

Three-process Electron architecture with three source directories and two TS project references:

- `src/main/` — Main process (Node.js). Tsconfig: `tsconfig.node.json`
- `src/preload/` — Preload scripts (IPC bridge). Tsconfig: `tsconfig.node.json`
- `src/renderer/` — Renderer (React UI). Tsconfig: `tsconfig.web.json`
- `src/shared/` — Types and schemas shared across all processes. Included in both tsconfigs.

## Commands

Package manager: **pnpm** (v10.30.1), Node 24. Versions pinned in `mise.toml`.

```bash
pnpm dev              # Start dev server (electron-vite dev)
pnpm build            # Typecheck + build (electron-vite build)
pnpm lint             # ESLint with cache
pnpm lint:fix         # ESLint with auto-fix
pnpm typecheck        # Run both node and web typechecks
pnpm typecheck:node   # tsc --noEmit -p tsconfig.node.json --composite false
pnpm typecheck:web    # tsc --noEmit -p tsconfig.web.json --composite false
```

There is **no test framework** configured (no vitest, jest, or test scripts). Validate changes with `pnpm typecheck && pnpm lint`.

## Code Style

Enforced by **@miskamyasa/eslint-config** (flat config in `eslint.config.js`). The shared config bundles TypeScript strict type checking, React + React Hooks, import ordering/validation, and stylistic rules — there is no Prettier and no separate TypeScript-ESLint config.

If you see an ESLint error, fix it by running `pnpm lint:fix` before making manual changes. Change code manually only if auto-fix can't handle it.

### Formatting

- **Double quotes**, **no semicolons**, **2-space indent** (spaces, not tabs)
- **LF** line endings, final newline required, trailing whitespace trimmed
- `console.log` is allowed (`"no-console": "off"`)
- No Prettier — formatting handled entirely by ESLint

### Imports

Separate type imports from value imports. Use `node:` protocol for Node built-ins. Use `@renderer/*` alias (maps to `src/renderer/src/*`) for renderer-internal imports. For shared code from renderer, use relative paths (`../../../shared/`):

```typescript
import type { RootStore } from "./RootStore"

import { join } from "node:path"
import { makeAutoObservable } from "mobx"
import { StoreProvider } from "@renderer/stores/StoreProvider"
import { AMOUNT_SCOPE_GOLD } from "../../../shared/amountScopes"
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
function GoldStatsImpl(): React.JSX.Element { /* ... */ }
export const GoldStats = observer(GoldStatsImpl)
```

- Access stores via `useStores()` hook (throws if used outside `StoreProvider`)
- Default exports are disallowed (`import-x/no-default-export`). The only exception is the electron-vite config file, which requires `export default` — use a file-local `// eslint-disable-next-line` there.

### State Management (MobX)

Class-based stores with `makeAutoObservable`. Each store takes `RootStore` in constructor (except `FetchQueueStore` which is standalone). Use `runInAction` for state updates after `await`:

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

Stores are provided via React context with a singleton pattern in `useStores.ts`. Stores expose `createFetch*Task()` methods returning `FetchTask` objects that are enqueued into `FetchQueueStore` for sequential execution with rate limiting.

### IPC & Validation

- IPC channels use namespaced kebab-case: `gold:fetch-quote`, `stock:fetch-quote`, `currency:fetch-rates`, `db:get-stock-cache`, etc.
- Main process registers handlers in `src/main/index.ts` via `ipcMain.handle()`
- Preload (`src/preload/index.ts`) exposes a typed `window.api` object; it validates all IPC payloads using Zod schemas before passing to renderer
- Shared schemas live in `src/shared/schemas/` using **`zod/mini`** (required because preload runs in context-isolated environment where `new Function()` is blocked)
- Main process schemas (`src/main/schemas/`) use standard **`zod`** (full version)
- API type declarations are in `src/preload/index.d.ts` — update this when adding new IPC methods

### Error Handling

- Use try/catch for IPC and async operations; log with `console.error`
- Use `notifyError(title, error)` from `@renderer/utils/notify` for user-facing errors in the renderer
- Guard clauses with descriptive `throw new Error(...)` for invalid state
- Catch/else/finally go on new lines (enforced by `.editorconfig`)
- Wrap unknown errors: `error instanceof Error ? error.message : "Unknown error occurred"`

### Database

- **better-sqlite3** via **Knex** query builder; schema defined in `src/main/database.ts`
- Repository functions in `src/main/repositories.ts` — all async, return plain objects
- Data passed over IPC must be serializable (use `JSON.parse(JSON.stringify(...))` for deep clone)

### Styling

- **Mantine** components for UI; use Mantine's theming system
- PostCSS with `postcss-preset-mantine` and `postcss-simple-vars`
- Inline `style` objects for simple one-off layouts
- No CSS Modules; use plain CSS files or Mantine's built-in styling

## Project Layout

```text
src/
├── main/              # Main process (index.ts, database.ts, stocks.ts, gold.ts, currency.ts, repositories.ts)
│   └── schemas/       # Zod schemas for external API responses (uses zod)
├── preload/           # Preload scripts (index.ts + index.d.ts for API types)
├── shared/            # Code shared across processes (types, schemas, constants)
│   └── schemas/       # Zod Mini schemas for IPC domain types (uses zod/mini)
└── renderer/src/      # React UI
    ├── App.tsx, main.tsx, ThemedApp.tsx
    ├── assets/        # CSS files
    ├── components/    # React components (GoldStats, StocksTable, etc.)
    ├── config/        # Static configuration (stock symbol lists)
    ├── stores/        # MobX stores (RootStore, AppStore, GoldStore, etc.)
    │   └── stocks/    # Sub-stores for stock table features
    └── utils/         # Helpers (notify, quoteFormatters)
```
