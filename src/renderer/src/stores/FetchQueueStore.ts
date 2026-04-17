import {makeAutoObservable, runInAction} from "mobx"

import {notifyError} from "../utils/notify"

const FETCH_INTERVAL = 1000

export type FetchTask = {
  label: string,
  execute: () => Promise<void>,
}

export class FetchQueueStore {
  totalCount = 0
  completedCount = 0
  running = false
  currentLabel: string | null = null

  private pendingTasks: FetchTask[] = []
  private abortController: AbortController | null = null

  constructor() {
    makeAutoObservable(this)
  }

  get progress(): number {
    return this.totalCount === 0 ? 0 : this.completedCount / this.totalCount
  }

  enqueue(tasks: FetchTask[]): void {
    this.pendingTasks.push(...tasks)
    this.totalCount += tasks.length

    if (!this.running) {
      void this.processQueue()
    }
  }

  clear(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
    this.pendingTasks = []
    this.totalCount = 0
    this.completedCount = 0
    this.running = false
    this.currentLabel = null
  }

  private async processQueue(): Promise<void> {
    this.running = true
    const abortController = new AbortController()
    this.abortController = abortController

    while (this.pendingTasks.length > 0) {
      if (abortController.signal.aborted)
        break

      const task = this.pendingTasks.shift()
      if (!task) break

      runInAction(() => {
        this.currentLabel = task.label
      })

      try {
        await task.execute()
        runInAction(() => {
          this.completedCount++
        })
      }
      catch (error) {
        notifyError(task.label, error)
      }

      if (this.pendingTasks.length > 0) {
        await new Promise(resolve => setTimeout(resolve, FETCH_INTERVAL))
      }
    }

    runInAction(() => {
      this.running = false
      this.currentLabel = null
    })

    if (this.abortController === abortController) {
      this.abortController = null
    }
  }
}
