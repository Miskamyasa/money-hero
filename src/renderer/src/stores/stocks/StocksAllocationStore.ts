import {computed, makeAutoObservable} from "mobx"

import type {StockQuote} from "../../../../shared/stocks"
import type {RootStore} from "../RootStore"

import type {StocksDataStore} from "./StocksDataStore"
import type {StocksUiStore} from "./StocksUiStore"

export class StocksAllocationStore {
  constructor(
    private data: StocksDataStore,
    private ui: StocksUiStore,
    private root: RootStore,
  ) {
    makeAutoObservable(this, {
      allocationSnapshot: computed({keepAlive: true}),
      allocations: computed({keepAlive: true}),
    })
  }

  get allocationSnapshot(): {allocations: Map<string, number>, balances: Map<string, number>} {
    // Allocation is only meaningful while buying mode is active with a positive budget.
    if (!this.ui.buyingMode || this.ui.investmentAmount <= 0) {
      return {
        allocations: new Map(),
        balances: new Map(),
      }
    }

    // Cannot allocate without exchange rates — prices would be compared across currencies.
    if (!this.root.currency.data) {
      return {
        allocations: new Map(),
        balances: new Map(),
      }
    }

    // Only score symbols that are enabled and have enough history for growth ranking.
    type QuoteWithHistory = StockQuote & {change2y: number}
    const scoreable: QuoteWithHistory[] = Array.from(this.data.quotes.values())
      .filter(q => this.ui.isSymbolEnabled(q.symbol))
      .filter((q): q is QuoteWithHistory => q.change2y != null)

    if (scoreable.length === 0) {
      return {
        allocations: new Map(),
        balances: new Map(),
      }
    }

    // Lower rank number means better growth / more scarce current allocation.
    const byGrowth = [...scoreable].sort((a, b) => b.change2y - a.change2y)
    const growthRank = new Map(byGrowth.map((q, i) => [q.symbol, i + 1]))

    // Scarcity ranking: normalize balances to USD so cross-currency comparison is fair.
    const byBalance = [...scoreable].sort((a, b) => {
      const balA = this.root.currency.convertToUsd(this.data.getBalance(a.symbol), a.currency) ?? 0
      const balB = this.root.currency.convertToUsd(this.data.getBalance(b.symbol), b.currency) ?? 0
      return balA - balB
    })
    const scarcityRank = new Map(byBalance.map((q, i) => [q.symbol, i + 1]))

    // Composite priority: lower value is preferred, symbol name is the final deterministic tiebreaker.
    // Convert prices and balances to USD; skip stocks whose currency rate is unavailable.
    const ranked = scoreable
      .map((q) => {
        const priceUsd = this.root.currency.convertToUsd(q.price, q.currency)
        const currentBalanceUsd = this.root.currency.convertToUsd(
          this.data.getBalance(q.symbol),
          q.currency,
        )
        if (priceUsd == null || currentBalanceUsd == null)
          return null

        return {
          symbol: q.symbol,
          priceUsd,
          priceNative: q.price,
          currency: q.currency,
          currentBalanceUsd,
          effectiveWeight: this.root.stockTargetWeights.getEffectiveWeight(q.symbol),
          priority: (growthRank.get(q.symbol) ?? 0) + (scarcityRank.get(q.symbol) ?? 0),
        }
      })
      .filter((item): item is NonNullable<typeof item> => item != null)
      .sort((a, b) => a.priority - b.priority || a.symbol.localeCompare(b.symbol))

    const totalCurrentBalanceUsd = ranked.reduce((sum, stock) => sum + stock.currentBalanceUsd, 0)
    const totalWeight = ranked.reduce((sum, stock) => sum + stock.effectiveWeight, 0)
    const totalPostBuyBalanceUsd = totalCurrentBalanceUsd + this.ui.investmentAmount

    const allocations = new Map<string, number>()
    const balances = new Map<string, number>()
    const balancesUsd = new Map<string, number>()
    let remaining = this.ui.investmentAmount

    // Greedy allocation loop: buy one share at a time while budget remains.
    while (remaining > 0) {
      let candidate: typeof ranked[number] | null = null
      let candidateFulfillmentRatio = Number.POSITIVE_INFINITY

      for (const stock of ranked) {
        if (stock.priceUsd <= 0 || stock.priceUsd > remaining) {
          continue
        }

        const allocatedBalanceUsd = balancesUsd.get(stock.symbol) ?? 0
        const projectedBalanceUsd = stock.currentBalanceUsd + allocatedBalanceUsd + stock.priceUsd
        const targetBalanceUsd = totalPostBuyBalanceUsd * (stock.effectiveWeight / totalWeight)
        const fulfillmentRatio = projectedBalanceUsd / targetBalanceUsd

        if (candidate == null) {
          candidate = stock
          candidateFulfillmentRatio = fulfillmentRatio
          continue
        }

        if (fulfillmentRatio < candidateFulfillmentRatio) {
          candidate = stock
          candidateFulfillmentRatio = fulfillmentRatio
          continue
        }

        if (fulfillmentRatio === candidateFulfillmentRatio) {
          const isHigherPriority = stock.priority < candidate.priority
          const isSamePriorityFirstSymbol = stock.priority === candidate.priority
            && stock.symbol.localeCompare(candidate.symbol) < 0

          if (isHigherPriority || isSamePriorityFirstSymbol) {
            candidate = stock
            candidateFulfillmentRatio = fulfillmentRatio
          }
        }
      }

      if (candidate == null) {
        // No stock can be bought with the remaining cash.
        break
      }

      allocations.set(candidate.symbol, (allocations.get(candidate.symbol) ?? 0) + 1)
      balances.set(candidate.symbol, (balances.get(candidate.symbol) ?? 0) + candidate.priceNative)
      balancesUsd.set(candidate.symbol, (balancesUsd.get(candidate.symbol) ?? 0) + candidate.priceUsd)
      remaining -= candidate.priceUsd
    }

    return {
      allocations,
      balances,
    }
  }

  get allocations(): Map<string, number> {
    return this.allocationSnapshot.allocations
  }

  getAllocation(symbol: string): number {
    return this.allocationSnapshot.allocations.get(symbol) ?? 0
  }

  getAllocationBalance(symbol: string): number {
    return this.allocationSnapshot.balances.get(symbol) ?? 0
  }
}
