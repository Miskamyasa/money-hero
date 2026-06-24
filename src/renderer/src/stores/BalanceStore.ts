import {makeAutoObservable} from "mobx"

import type {RootStore} from "./RootStore"

export class BalanceStore {
  constructor(private root: RootStore) {
    makeAutoObservable(this)
  }

  get vtBalanceIls(): number {
    const {vwra, currency} = this.root
    if (vwra.amount === 0)
      return 0
    return currency.convertToIls(vwra.balance, vwra.quote?.currency ?? "USD") ?? 0
  }

  get taseBalanceIls(): number {
    const {tase, currency} = this.root
    if (tase.amount === 0)
      return 0
    return currency.convertToIls(tase.balance, tase.quote?.currency ?? "USD") ?? 0
  }

  get copxBalanceIls(): number {
    const {copx, currency} = this.root
    if (copx.amount === 0)
      return 0
    return currency.convertToIls(copx.balance, copx.quote?.currency ?? "USD") ?? 0
  }

  get psiBalanceIls(): number {
    const {psi, currency} = this.root
    if (psi.amount === 0)
      return 0
    return currency.convertToIls(psi.balance, psi.quote?.currency ?? "USD") ?? 0
  }

  get healLBalanceIls(): number {
    const {healL, currency} = this.root
    if (healL.amount === 0)
      return 0
    return currency.convertToIls(healL.balance, healL.quote?.currency ?? "USD") ?? 0
  }

  get iglnBalanceIls(): number {
    const {igln, currency} = this.root
    if (igln.amount === 0)
      return 0
    return currency.convertToIls(igln.balance, igln.quote?.currency ?? "USD") ?? 0
  }

  get allStocksBalanceIls(): number {
    const {
      psagotEtfs,
      fundsEtfs,
      stocksAi,
      stocksHc,
      stocksRobotics,
      stocksBigTech,
      stocksEnergy,
      // aristocrats,
      // water,
    } = this.root
    const seen = new Set<string>()
    let total = 0

    for (const store of [
      psagotEtfs,
      fundsEtfs,
      stocksAi,
      stocksHc,
      stocksRobotics,
      stocksBigTech,
      stocksEnergy,
      // aristocrats,
      // water,
    ]) {
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
    return this.vtBalanceIls
      + this.taseBalanceIls
      + this.copxBalanceIls
      + this.psiBalanceIls
      + this.healLBalanceIls
      + this.iglnBalanceIls
      + this.allStocksBalanceIls
  }

  shareOfTotal(balanceIls: number): number {
    const total = this.totalBalanceIls
    if (total <= 0 || balanceIls <= 0 || !Number.isFinite(balanceIls))
      return 0
    return balanceIls / total
  }

  get vtShareOfTotal(): number {
    return this.shareOfTotal(this.vtBalanceIls)
  }

  get iglnShareOfTotal(): number {
    return this.shareOfTotal(this.iglnBalanceIls)
  }

  get taseShareOfTotal(): number {
    return this.shareOfTotal(this.taseBalanceIls)
  }

  get copxShareOfTotal(): number {
    return this.shareOfTotal(this.copxBalanceIls)
  }

  get psiShareOfTotal(): number {
    return this.shareOfTotal(this.psiBalanceIls)
  }

  get healLShareOfTotal(): number {
    return this.shareOfTotal(this.healLBalanceIls)
  }
}
