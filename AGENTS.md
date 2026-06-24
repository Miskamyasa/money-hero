# AGENTS.md

Money Hero Electron desktop app — React, TypeScript, Vite, MobX, Mantine UI.

## Architecture

Three-process Electron architecture with four source roots and two TS project references:

- `src/main/` — Main process (Node.js). App bootstrap, Yahoo fetchers, SQLite repositories. Tsconfig: `tsconfig.node.json`
- `src/preload/` — Preload scripts (IPC bridge). Exposes `window.api` and validates IPC payloads. Tsconfig: `tsconfig.node.json`
- `src/renderer/` — Renderer shell (`index.html`) and React UI under `src/renderer/src/`. Dashboard shell, components, MobX stores. Tsconfig: `tsconfig.web.json`
- `src/shared/` — Types, scopes, and IPC schemas shared across processes. Included in both tsconfigs.

### Domain Split

- **Market data** — `src/main/{stocks,gold,currency,yahooHistory}.ts` plus renderer stores `CurrencyStore`, `GoldStore`, `SymbolStore`
- **Persistence** — `src/main/{database,repositories}.ts` plus renderer persistence-facing stores (`StockAmountsStore`, `StockTargetWeightsStore`, `StocksUiStore`)
- **IPC/contracts** — `src/preload/index.ts`, `src/preload/index.d.ts`, `src/shared/*`, `src/main/schemas/*`
- **Portfolio state engine** — `src/renderer/src/stores/*`, centered on `RootStore`
- **Dashboard presentation** — `src/renderer/src/App.tsx`, `components/*` (including benchmark cards, `ExpectedBalanceWidget`, tables, and drawers), `config/*`, `utils/*`
- **Dormant slices** — commented-out stock universes (`water`, `aristocrats`) and symbol-widget UI blocks that are preserved in code but not rendered

The active stock watchlists are defined in `src/renderer/src/config/stockUniverses.ts`: `INDIVIDUAL_STOCKS_ROBOTICS`, `INDIVIDUAL_STOCKS_HC`, `INDIVIDUAL_STOCKS_AI`, `INDIVIDUAL_STOCKS_BIGTECH`, `INDIVIDUAL_STOCKS_ENERGY`, `FUNDS_ETFS`, and `PSAGOT_ETFS`. `WATER` and `DIVIDEND_ARISTOCRATS` remain in config but their store/UI wiring is commented out.

## Commands

Package manager: **pnpm** (v11.4.0), Node 24. Versions pinned in `mise.toml`.

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

Workspace/build settings live in `pnpm-workspace.yaml`: `onlyBuiltDependencies` whitelists native modules (`electron`, `electron-winstaller`, `esbuild`, `better-sqlite3`) and `trustPolicy: off` disables lifecycle scripts by default. Don't run `pnpm approve-builds` or edit these unless adding a new native dependency.

## Code Style

Enforced by **@miskamyasa/eslint-config** (flat config in `eslint.config.js`). The shared config bundles TypeScript strict type checking, React + React Hooks, import ordering/validation, and stylistic rules — there is no Prettier and no separate TypeScript-ESLint config.

If you see an ESLint error, fix it by running `pnpm lint:fix` before making manual changes. Change code manually only if auto-fix can't handle it.

### Formatting

- **Double quotes**, **no semicolons**, **2-space indent** (spaces, not tabs)
- **LF** line endings, final newline required, trailing whitespace trimmed
- `console.warn` and `console.error` are exempt; other console usage is lint-warned, not hard-blocked
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

`RootStore` is the renderer domain hub. The currently active live slices are:

- `app`, `currency`, `gold`, `sp500`, `ta125`
- `stocksRobotics`, `stocksHc`, `stocksAi`, `stocksBigTech`, `stocksEnergy`, `fundsEtfs`, `psagotEtfs`
- `stockAmounts`, `stockTargetWeights`, `theme`, `fetchQueue`, `balance`, `expectedBalance`

Additional `SymbolStore`s for `VWRA.L`, `IGLN.L`, `MORE-S7.TA`, `COPX`, `PSI`, and `HEAL.L` still exist for optional balance plumbing and startup quote fetches, but their widget UI plus amount/cache hydration remain commented out in `App.tsx`, and `refreshAll()` skips them.

The `water` and `aristocrats` `StocksStore` instances are intentionally left commented out in `RootStore.ts`, `App.tsx`, `FilterDrawer.tsx`, and `BalanceStore.ts` — preserve them as-is unless the user asks to restore those watchlists.

Startup hydration is orchestrated from `App.tsx`: cached renderer state is loaded first for the live watchlists and dashboard widgets, then `RootStore.fetchStartupItems()` seeds the fetch queue (including hidden symbol quotes), and `RootStore.startAutoRefresh()` refreshes the main dashboard every 20 minutes.

### IPC & Validation

- IPC channels use namespaced kebab-case: `gold:fetch-quote`, `stock:fetch-quote`, `currency:fetch-rates`, `db:get-stock-cache`, etc.
- Main process registers handlers in `src/main/index.ts` via `ipcMain.handle()`
- Preload (`src/preload/index.ts`) exposes a typed `window.api` object; stock-focused IPC payloads are runtime-validated there before they reach renderer code
- Shared schemas live in `src/shared/schemas/` using **`zod/mini`** (required because preload runs in context-isolated environment where `new Function()` is blocked)
- Main process schemas (`src/main/schemas/`) use standard **`zod`** (full version)
- API type declarations are in `src/preload/index.d.ts` — update this when adding new IPC methods

Notes:

- Stock quote/amount/weight payloads are runtime-validated in preload. Gold, currency, and generic KV payloads are more weakly typed today, so be careful when extending them.
- Many DB IPC channel names are duplicated as string literals across main and preload. If you rename one, update both sides.

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

Important tables:

- `stock_quotes` — quote cache with historical deltas and serialized dividends
- `stock_amounts_scoped` — primary holdings storage
- `stock_target_weights_scoped` — target weights
- `stock_disabled_symbols` — per-table symbol toggles
- `kv_cache` — generic cache for currency, gold, symbol widgets, and collapse state

`stock_amounts` still exists as a legacy table and is lazily migrated for the `"stocks"` scope. Treat scoped amounts as the canonical path for new work.

### Styling

- **Mantine** components for UI; use Mantine's theming system
- PostCSS with `postcss-preset-mantine` and `postcss-simple-vars`
- Inline `style` objects for simple one-off layouts
- No CSS Modules; use plain CSS files or Mantine's built-in styling

## Project Layout

```text
src/
├── main/              # Main process (index.ts, database.ts, stocks.ts, gold.ts, currency.ts, repositories.ts, yahooHistory.ts)
│   └── schemas/       # Zod schemas for external API responses (uses zod)
├── preload/           # Preload scripts (index.ts + index.d.ts for API types)
├── shared/            # Code shared across processes (types, schemas, constants)
│   └── schemas/       # Zod Mini schemas for IPC domain types (uses zod/mini)
└── renderer/src/      # React UI
    ├── App.tsx, main.tsx, ThemedApp.tsx
    ├── assets/        # CSS files
    ├── components/    # Dashboard widgets, tables, drawers, and shared presentation pieces
    ├── config/        # Static configuration (watchlists, widget titles)
    ├── stores/        # MobX stores (RootStore, market data, balances, theme, etc.)
    │   └── stocks/    # Sub-stores for stock table features
    └── utils/         # Helpers (notify, quoteFormatters)
```
