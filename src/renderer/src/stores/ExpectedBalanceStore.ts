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
  change1y: number,
  change2y: number | null,
}

type ProjectionSummary = {
  currentBalanceIls: number,
  projectedBalanceIls: number,
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

  get expectedBalance1yChangePercent(): number {
    return this.getProjectionChangePercent(this.getProjectedBalanceSummary(1))
  }

  get expectedBalance5yChangePercent(): number {
    return this.getProjectionChangePercent(this.getProjectedBalance5ySummary())
  }

  private getProjectedBalanceIls(years: number): number {
    return this.getProjectedBalanceSummary(years).projectedBalanceIls
  }

  private getProjectedBalance5yIls(): number {
    return this.getProjectedBalance5ySummary().projectedBalanceIls
  }

  private getProjectedBalanceSummary(years: number): ProjectionSummary {
    let currentBalanceIls = 0
    let projectedBalanceIls = 0

    for (const position of this.getProjectedPositions()) {
      const currentPositionBalanceIls = this.root.currency.convertToIls(position.currentBalance, position.currency)
      const projectedPositionBalance = position.currentBalance * ((1 + position.change1y) ** years)
      const projectedPositionBalanceIls = this.root.currency.convertToIls(projectedPositionBalance, position.currency)

      if (currentPositionBalanceIls == null || projectedPositionBalanceIls == null) {
        continue
      }

      currentBalanceIls += currentPositionBalanceIls
      projectedBalanceIls += projectedPositionBalanceIls
    }

    return {currentBalanceIls, projectedBalanceIls}
  }

  private getProjectedBalance5ySummary(): ProjectionSummary {
    let currentBalanceIls = 0
    let projectedBalanceIls = 0

    for (const position of this.getProjectedPositions()) {
      if (position.change2y == null) {
        continue
      }

      const annualizedRate = ((1 + position.change2y) ** (1 / 2)) - 1
      const projectedBalance = position.currentBalance * ((1 + annualizedRate) ** 5)
      const currentPositionBalanceIls = this.root.currency.convertToIls(position.currentBalance, position.currency)
      const projectedPositionBalanceIls = this.root.currency.convertToIls(projectedBalance, position.currency)

      if (
        !Number.isFinite(annualizedRate)
        || currentPositionBalanceIls == null
        || projectedPositionBalanceIls == null
      ) {
        continue
      }

      currentBalanceIls += currentPositionBalanceIls
      projectedBalanceIls += projectedPositionBalanceIls
    }

    return {currentBalanceIls, projectedBalanceIls}
  }

  private getProjectionChangePercent(summary: ProjectionSummary): number {
    if (summary.currentBalanceIls <= 0 || !Number.isFinite(summary.projectedBalanceIls)) {
      return 0
    }

    return ((summary.projectedBalanceIls / summary.currentBalanceIls) - 1) * 100
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
