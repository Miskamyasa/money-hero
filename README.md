# Money Hero

A desktop investment dashboard that tracks gold, stocks, and currency exchange rates. Built with Electron, React, and TypeScript.

<table>
  <tr>
    <td><img src="assets/14-February-13-57-20.jpg" alt="Filter Stocks drawer" /></td>
    <td><img src="assets/14-February-13-56-58.jpg" alt="Dark theme" /></td>
    <td><img src="assets/14-February-13-57-07.jpg" alt="Light theme" /></td>
  </tr>
  <tr>
    <td><em>Filter Stocks drawer</em></td>
    <td><em>Dark theme</em></td>
    <td><em>Light theme</em></td>
  </tr>
</table>

## Features

- **Gold Widget** — Live gold futures price (`GC=F`) with historical performance (1M / 6M / 2Y)
- **Benchmark Widgets** — Dedicated cards for the S&P 500 (`^GSPC`) and TA-35 (`TA35.TA`)
- **Three Active Stock Watchlists** — Separate tables for **IBI: Individual Stocks**, **IBI: Funds / ETFs**, and **Psagot: Funds / ETFs**
- **Currency Rates** — USD and DXY plus selected FX rates from Yahoo Finance
- **Portfolio Balance** — Aggregated tracked holdings balance, converted to ILS
- **Buy Mode** — Enter an investment amount and see how it would be allocated across stocks in a watchlist
- **Sortable & Filterable Tables** — Sort stocks by 1M / 6M / 2Y performance, filter by name or symbol
- **Editable Holdings** — Set the number of shares you own per symbol; balances update automatically
- **Dividend Yield** — Annualized dividend yield calculated from historical dividend events
- **Local Database** — All quotes and holdings are cached in a local SQLite database for instant startup
- **Auto-Refresh** — Data refreshes automatically every 20 minutes with a sequential fetch queue and rate limiting
- **Dark / Light Theme** — Toggle between color schemes with a single click
- **Cross-Platform** — Builds for macOS, Windows, and Linux

## Current Scope

- The app is currently a single dashboard screen, not a multi-page or routed UI.
- The live watchlists are `INDIVIDUAL_STOCKS`, `FUNDS_ETFS`, and `PSAGOT_ETFS` from `src/renderer/src/config/stockUniverses.ts`.
- Additional preset universes — **Dividend Aristocrats**, **High Yield**, and **Water** — are still present in config, but their store/UI wiring is commented out.
- Extra symbol widgets for `VWRA.L`, `IGLN.L`, `MORE-S7.TA`, `COPX`, `PSI`, and `HEAL.L` still exist in the store layer, but their dashboard cards are currently commented out.

## Tech Stack

| Layer       | Technology                                                                                   |
| ----------- |----------------------------------------------------------------------------------------------|
| Framework   | [Electron](https://www.electronjs.org/) with [electron-vite](https://electron-vite.org/)     |
| UI          | [React 19](https://react.dev/) + [Mantine 8](https://mantine.dev/)                           |
| State       | [MobX](https://mobx.js.org/) (class-based stores)                                            |
| Language    | [TypeScript 5](https://www.typescriptlang.org/)                                              |
| Database    | [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) via [Knex](https://knexjs.org/) |
| Validation  | [Zod 4](https://zod.dev/) (standard in main process, `zod/mini` in preload)                  |
| Data Source | [Yahoo Finance](https://finance.yahoo.com/) Chart API                                        |
| Linting     | [@miskamyasa/eslint-config](https://github.com/miskamyasa/eslint-config) (no Prettier)       |
| Build       | [electron-builder](https://www.electron.build/)                                              |

## Prerequisites

- **Node.js** 24
- **pnpm** 10

Exact versions are pinned in `mise.toml`. If you use [mise](https://mise.jdx.dev/), run `mise install` to set them up automatically.

## Getting Started

```bash
# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

There is no test runner configured. The expected verification pass is:

```bash
pnpm typecheck
pnpm lint
```

## Scripts

| Command            | Description                                     |
| ------------------ | ----------------------------------------------- |
| `pnpm dev`         | Start Electron in development mode with HMR     |
| `pnpm build`       | Type-check and build for production             |
| `pnpm start`       | Preview the production build                    |
| `pnpm lint`        | Run ESLint (with cache)                         |
| `pnpm lint:fix`    | Run ESLint and auto-fix issues                  |
| `pnpm typecheck`   | Run TypeScript type-checking for both processes |
| `pnpm typecheck:node` | Run the Node/main/preload type-check         |
| `pnpm typecheck:web`  | Run the renderer type-check                  |
| `pnpm build:mac`   | Build a distributable for macOS                 |
| `pnpm build:win`   | Build a distributable for Windows               |
| `pnpm build:linux` | Build a distributable for Linux                 |
| `pnpm build:unpack` | Build an unpacked app bundle                   |

## Architecture

The app follows the standard three-process Electron architecture:

```text
src/
├── main/              # Main process — Yahoo fetchers, database, repositories, IPC handlers
│   └── schemas/       # Zod schemas for Yahoo Finance API responses
├── preload/           # Preload scripts — typed IPC bridge exposed as window.api
├── shared/            # Cross-process types, scopes, and IPC schemas
│   └── schemas/       # Zod Mini schemas for IPC domain types
└── renderer/src/      # Renderer process — React UI + MobX state engine
    ├── components/    # Dashboard widgets, tables, drawers
    ├── config/        # Stock universes and widget metadata
    ├── stores/        # RootStore, market data stores, portfolio stores, theme/balance
    │   └── stocks/    # Stock table data/UI/allocation sub-stores
    └── utils/         # Formatting, notifications, widget helpers
```

### Runtime Domains

- **Market data** — Yahoo Finance fetchers in `src/main/` plus renderer stores for gold, currency, and benchmark/index symbols
- **Persistence** — SQLite via Knex/better-sqlite3 with quote cache, scoped holdings, target weights, disabled symbols, and KV cache
- **IPC/contracts** — `window.api` in preload, shared stock schemas in `src/shared/`, Yahoo response schemas in `src/main/schemas/`
- **Portfolio engine** — `RootStore`, `StocksStore`, and the stock-table sub-stores coordinate hydration, fetch queueing, allocations, and totals
- **Presentation** — a single dashboard shell in `src/renderer/src/App.tsx` backed by Mantine components

- **Main process** fetches data from Yahoo Finance, manages the SQLite database, and exposes IPC handlers.
- **Preload script** bridges main and renderer with a typed `window.api` object.
- **Renderer** is a React SPA using MobX for state management and Mantine for the component library.

## License

This project is licensed under the **GNU General Public License v3.0** — see the [LICENSE](LICENSE) file for details.
