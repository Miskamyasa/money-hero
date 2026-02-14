import type { StocksDataStore } from "./StocksDataStore"
import type { StocksUiStore } from "./StocksUiStore"

import { computed, makeAutoObservable } from "mobx"

export class StocksAllocationStore {
  constructor(private data: StocksDataStore, private ui: StocksUiStore) {
    makeAutoObservable(this, {
      allocationSnapshot: computed({ keepAlive: true }),
      allocations: computed({ keepAlive: true }),
    })
  }

  get allocationSnapshot(): { allocations: Map<string, number>, balances: Map<string, number> } {
    // Allocation is only meaningful while buying mode is active with a positive budget.
    if (!this.ui.buyingMode || this.ui.investmentAmount <= 0) {
      return {
        allocations: new Map(),
        balances: new Map(),
      }
    }

    // Only score symbols that are enabled and have enough history for growth ranking.
    const scoreable = Array.from(this.data.quotes.values())
      .filter(q => this.ui.isSymbolEnabled(q.symbol))
      .filter(q => q.change2y != null)

    if (scoreable.length === 0) {
      return {
        allocations: new Map(),
        balances: new Map(),
      }
    }

    // Lower rank number means better growth / more scarce current allocation.
    const byGrowth = [...scoreable].sort((a, b) => b.change2y! - a.change2y!)
    const growthRank = new Map(byGrowth.map((q, i) => [q.symbol, i + 1]))

    const byBalance = [...scoreable].sort(
      (a, b) => this.data.getBalance(a.symbol) - this.data.getBalance(b.symbol),
    )
    const scarcityRank = new Map(byBalance.map((q, i) => [q.symbol, i + 1]))

    // Composite priority: lower value is preferred, symbol name is the final deterministic tiebreaker.
    const ranked = scoreable
      .map(q => ({
        symbol: q.symbol,
        price: q.price,
        currentBalance: this.data.getBalance(q.symbol),
        priority: growthRank.get(q.symbol)! + scarcityRank.get(q.symbol)!,
      }))
      .sort((a, b) => a.priority - b.priority || a.symbol.localeCompare(b.symbol))

    const allocations = new Map<string, number>()
    const balances = new Map<string, number>()
    let remaining = this.ui.investmentAmount

    // Greedy allocation loop: buy one share at a time while budget remains.
    while (remaining > 0) {
      let candidate: typeof ranked[number] | null = null
      let candidateProjectedBalance = Number.POSITIVE_INFINITY

      for (const stock of ranked) {
        if (stock.price <= 0 || stock.price > remaining) {
          continue
        }

        const allocatedBalance = balances.get(stock.symbol) ?? 0
        const projectedBalance = stock.currentBalance + allocatedBalance

        if (candidate == null) {
          candidate = stock
          candidateProjectedBalance = projectedBalance
          continue
        }

        if (projectedBalance < candidateProjectedBalance) {
          candidate = stock
          candidateProjectedBalance = projectedBalance
          continue
        }

        if (projectedBalance === candidateProjectedBalance) {
          const isHigherPriority = stock.priority < candidate.priority
          const isSamePriorityFirstSymbol = stock.priority === candidate.priority
            && stock.symbol.localeCompare(candidate.symbol) < 0

          if (isHigherPriority || isSamePriorityFirstSymbol) {
            candidate = stock
            candidateProjectedBalance = projectedBalance
          }
        }
      }

      if (candidate == null) {
        // No stock can be bought with the remaining cash.
        break
      }

      allocations.set(candidate.symbol, (allocations.get(candidate.symbol) ?? 0) + 1)
      balances.set(candidate.symbol, (balances.get(candidate.symbol) ?? 0) + candidate.price)
      remaining -= candidate.price
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
