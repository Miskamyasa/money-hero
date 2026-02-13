import { describe, expect, it } from "vitest"
import { AppStore } from "./AppStore"
import { RootStore } from "./RootStore"

describe("appStore", () => {
  it("starts uninitialized", () => {
    const root = new RootStore()
    const store = new AppStore(root)

    expect(store.initialized).toBe(false)
    expect(store.isReady).toBe(false)
  })

  it("sets initialized", () => {
    const root = new RootStore()
    const store = new AppStore(root)

    store.setInitialized(true)

    expect(store.initialized).toBe(true)
    expect(store.isReady).toBe(true)
  })

  it("exposes the root store", () => {
    const root = new RootStore()
    const store = new AppStore(root)

    expect(store.rootStore).toBe(root)
  })
})
