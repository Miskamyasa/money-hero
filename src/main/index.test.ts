import { describe, expect, it, vi } from "vitest"

vi.mock("electron", () => import("../../test/__mocks__/electron"))

describe("main process", () => {
  it("electron mock is available", async () => {
    const { app } = await import("electron")

    expect(app.whenReady).toBeDefined()
    expect(app.on).toBeDefined()
  })
})
