import type { RootStore } from "./RootStore"

import { makeAutoObservable } from "mobx"

export class AppStore {
  constructor(private root: RootStore) {
    makeAutoObservable(this)
  }

  initialized = false

  setInitialized(value: boolean): void {
    this.initialized = value
  }

  get rootStore(): RootStore {
    return this.root
  }

  get isReady(): boolean {
    return this.initialized
  }
}
