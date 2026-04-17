import {makeAutoObservable} from "mobx"

import type {RootStore} from "./RootStore"

export class BalanceStore {
  constructor(private root: RootStore) {
    makeAutoObservable(this)
  }

  get goldBalanceIls(): number {
    const {gold, currency} = this.root
    if (gold.amount === 0)
      return 0
    return currency.convertToIls(gold.balance, gold.quote?.currency ?? "USD") ?? 0
  }

  get vtBalanceIls(): number {
    const {vwra, currency} = this.root
    if (vwra.amount === 0)
      return 0
    return currency.convertToIls(vwra.balance, vwra.quote?.currency ?? "USD") ?? 0
  }

  get vooBalanceIls(): number {
    const {voo, currency} = this.root
    if (voo.amount === 0)
      return 0
    return currency.convertToIls(voo.balance, voo.quote?.currency ?? "USD") ?? 0
  }

  get allStocksBalanceIls(): number {
    const {aristocrats, highYield, water} = this.root
    const seen = new Set<string>()
    let total = 0

    for (const store of [aristocrats, highYield, water]) {
      for (const quote of store.activeQuotes) {
        if (seen.has(quote.symbol))
          continue
        seen.add(quote.symbol)
        const amount = store.data.getAmount(quote.symbol)
        if (amount === 0)
          continue
        const balance = store.data.getBalance(quote.symbol)
        const balanceIls = this.root.currency.convertToIls(balance, quote.currency)
        if (balanceIls != null)
          total += balanceIls
      }
    }

    return total
  }

  get totalBalanceIls(): number {
    return this.goldBalanceIls
      + this.vtBalanceIls
      + this.vooBalanceIls
      + this.allStocksBalanceIls
  }
}
