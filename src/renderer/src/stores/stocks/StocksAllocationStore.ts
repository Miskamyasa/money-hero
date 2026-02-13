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
    if (!this.ui.buyingMode || this.ui.investmentAmount <= 0) {
      return {
        allocations: new Map(),
        balances: new Map(),
      }
    }

    const scoreable = Array.from(this.data.quotes.values())
      .filter(q => q.change2y != null)

    if (scoreable.length === 0) {
      return {
        allocations: new Map(),
        balances: new Map(),
      }
    }

    const byGrowth = [...scoreable].sort((a, b) => b.change2y! - a.change2y!)
    const growthRank = new Map(byGrowth.map((q, i) => [q.symbol, i + 1]))

    const byAmount = [...scoreable].sort(
      (a, b) => this.data.getAmount(a.symbol) - this.data.getAmount(b.symbol),
    )
    const scarcityRank = new Map(byAmount.map((q, i) => [q.symbol, i + 1]))

    const ranked = scoreable
      .map(q => ({
        symbol: q.symbol,
        price: q.price,
        priority: growthRank.get(q.symbol)! + scarcityRank.get(q.symbol)!,
      }))
      .sort((a, b) => a.priority - b.priority || a.symbol.localeCompare(b.symbol))

    const allocations = new Map<string, number>()
    const balances = new Map<string, number>()
    let remaining = this.ui.investmentAmount
    let changed = true

    while (changed) {
      changed = false
      for (const stock of ranked) {
        if (stock.price > 0 && stock.price <= remaining) {
          allocations.set(stock.symbol, (allocations.get(stock.symbol) ?? 0) + 1)
          balances.set(stock.symbol, (balances.get(stock.symbol) ?? 0) + stock.price)
          remaining -= stock.price
          changed = true
        }
      }
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
