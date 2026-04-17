import {makeAutoObservable} from "mobx"

import type {RootStore} from "./RootStore"

type ColorScheme = "light" | "dark"

const STORAGE_KEY = "money-hero-color-scheme"

export class ThemeStore {
  constructor(private root: RootStore) {
    makeAutoObservable(this)
    this.colorScheme = this.loadColorScheme()
  }

  colorScheme: ColorScheme = "dark"

  get rootStore(): RootStore {
    return this.root
  }

  get isDark(): boolean {
    return this.colorScheme === "dark"
  }

  setColorScheme(scheme: ColorScheme): void {
    this.colorScheme = scheme
    localStorage.setItem(STORAGE_KEY, scheme)
  }

  toggleColorScheme(): void {
    this.setColorScheme(this.isDark ? "light" : "dark")
  }

  private loadColorScheme(): ColorScheme {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "light" || stored === "dark") {
      return stored
    }
    return "dark"
  }
}
