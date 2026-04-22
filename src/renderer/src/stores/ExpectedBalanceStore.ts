import {makeAutoObservable} from "mobx"

import type {StockQuote} from "../../../shared/stocks"

import type {RootStore} from "./RootStore"
import type {StocksStore} from "./StocksStore"

const PROJECTION_SOURCE_STORES = [
  "individualStocks",
  "fundsEtfs",
  "psagotEtfs",
] as const satisfies readonly (keyof RootStore)[]

type PositionProjection = {
  currentBalance: number,
  currency: string,
  change1y: number | null,
  change2y: number | null,
}

export class ExpectedBalanceStore {
  constructor(private root: RootStore) {
    makeAutoObservable(this)
  }

  get expectedBalance1yIls(): number {
    return this.getProjectedBalanceIls(1)
  }

  get expectedBalance5yIls(): number {
    return this.getProjectedBalance5yIls()
  }

  private getProjectedBalanceIls(years: number): number {
    let total = 0

    for (const position of this.getProjectedPositions()) {
      if (position.change1y == null) {
        continue
      }

      const projectedBalance = position.currentBalance * ((1 + position.change1y) ** years)
      const projectedBalanceIls = this.root.currency.convertToIls(projectedBalance, position.currency)

      if (projectedBalanceIls != null) {
        total += projectedBalanceIls
      }
    }

    return total
  }

  private getProjectedBalance5yIls(): number {
    let total = 0

    for (const position of this.getProjectedPositions()) {
      if (position.change2y == null) {
        continue
      }

      const annualizedRate = ((1 + position.change2y) ** (1 / 2)) - 1
      const projectedBalance = position.currentBalance * ((1 + annualizedRate) ** 5)
      const projectedBalanceIls = this.root.currency.convertToIls(projectedBalance, position.currency)

      if (projectedBalanceIls != null) {
        total += projectedBalanceIls
      }
    }

    return total
  }

  private getProjectedPositions(): PositionProjection[] {
    const seen = new Set<string>()
    const positions: PositionProjection[] = []

    for (const storeKey of PROJECTION_SOURCE_STORES) {
      const store = this.root[storeKey]
      for (const quote of store.activeQuotes) {
        const position = this.getProjectedPosition(store, quote, seen)
        if (position != null) {
          positions.push(position)
        }
      }
    }

    return positions
  }

  private getProjectedPosition(
    store: StocksStore,
    quote: StockQuote,
    seen: Set<string>,
  ): PositionProjection | null {
    if (seen.has(quote.symbol)) {
      return null
    }
    seen.add(quote.symbol)

    const amount = store.data.getAmount(quote.symbol)
    if (amount <= 0 || quote.change1y == null) {
      return null
    }

    return {
      currentBalance: store.data.getBalance(quote.symbol),
      currency: quote.currency,
      change1y: quote.change1y / 100,
      change2y: quote.change2y != null ? quote.change2y / 100 : null,
    }
  }
}
