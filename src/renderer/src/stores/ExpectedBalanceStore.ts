import {makeAutoObservable} from "mobx"

import type {StockQuote} from "../../../shared/stocks"

import type {RootStore} from "./RootStore"
import type {StocksStore} from "./StocksStore"

const PROJECTION_SOURCE_STORES = [
  "stocksHc",
  "stocksAi",
  "stocksRobotics",
  "stocksBigTech",
  "stocksEnergy",
  "fundsEtfs",
  "psagotEtfs",
] as const satisfies readonly (keyof RootStore)[]

const CONSERVATIVE_1Y_RETURN_FACTOR = 0.6
const HOT_STREAK_1Y_RETURN_FACTOR = 1
const CONSERVATIVE_5Y_DECAY = [0.8, 0.7, 0.6, 0.5, 0.4] as const
const HOT_STREAK_5Y_DECAY = [1, 0.9, 0.8, 0.7, 0.6] as const

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

export type ExpectedBalanceScenario = {
  projectedBalanceIls: number,
  changePercent: number,
}

export class ExpectedBalanceStore {
  constructor(private root: RootStore) {
    makeAutoObservable(this)
  }

  get expectedBalance1yConservative(): ExpectedBalanceScenario {
    return this.getProjectedBalance1yScenario(CONSERVATIVE_1Y_RETURN_FACTOR)
  }

  get expectedBalance1yHotStreak(): ExpectedBalanceScenario {
    return this.getProjectedBalance1yScenario(HOT_STREAK_1Y_RETURN_FACTOR)
  }

  get expectedBalance5yConservative(): ExpectedBalanceScenario {
    return this.getProjectedBalance5yScenario(CONSERVATIVE_5Y_DECAY)
  }

  get expectedBalance5yHotStreak(): ExpectedBalanceScenario {
    return this.getProjectedBalance5yScenario(HOT_STREAK_5Y_DECAY)
  }

  private createScenario(summary: ProjectionSummary): ExpectedBalanceScenario {
    return {
      projectedBalanceIls: summary.projectedBalanceIls,
      changePercent: this.getProjectionChangePercent(summary),
    }
  }

  private getProjectedBalance1yScenario(returnFactor: number): ExpectedBalanceScenario {
    return this.createScenario(this.getProjectedBalance1ySummary(returnFactor))
  }

  private getProjectedBalance5yScenario(decay: readonly number[]): ExpectedBalanceScenario {
    return this.createScenario(this.getProjectedBalance5ySummary(decay))
  }

  private getProjectedBalance1ySummary(returnFactor: number): ProjectionSummary {
    let currentBalanceIls = 0
    let projectedBalanceIls = 0

    for (const position of this.getProjectedPositions()) {
      const currentPositionBalanceIls = this.root.currency.convertToIls(position.currentBalance, position.currency)
      const projectedPositionBalance = position.currentBalance * (1 + (position.change1y * returnFactor))
      const projectedPositionBalanceIls = this.root.currency.convertToIls(projectedPositionBalance, position.currency)

      if (currentPositionBalanceIls == null || projectedPositionBalanceIls == null) {
        continue
      }

      currentBalanceIls += currentPositionBalanceIls
      projectedBalanceIls += projectedPositionBalanceIls
    }

    return {currentBalanceIls, projectedBalanceIls}
  }

  private getProjectedBalance5ySummary(decay: readonly number[]): ProjectionSummary {
    let currentBalanceIls = 0
    let projectedBalanceIls = 0

    for (const position of this.getProjectedPositions()) {
      if (position.change2y == null) {
        continue
      }

      const annualizedRate = ((1 + position.change2y) ** (1 / 2)) - 1
      const projectedBalance = position.currentBalance * this.getDecayMultiplier(annualizedRate, decay)
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

  private getDecayMultiplier(annualizedRate: number, decay: readonly number[]): number {
    return decay.reduce((multiplier, decayFactor) => multiplier * (1 + (annualizedRate * decayFactor)), 1)
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
