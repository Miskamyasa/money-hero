import {createContext, use} from "react"

import {RootStore} from "./RootStore"

let stores: RootStore | null = null

export const StoresContext = createContext<RootStore | null>(null)

export function getStores() {
  stores ??= new RootStore()
  return stores
}

export function useStores() {
  const ctx = use(StoresContext)

  if (!ctx) {
    throw new Error("useStores must be used within a StoresProvider.")
  }

  return ctx
}
