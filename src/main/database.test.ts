import { tmpdir } from "node:os"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("electron", () => import("../../test/__mocks__/electron"))

describe("database module", () => {
  beforeEach(async () => {
    // Reset module state
    vi.resetModules()

    // Mock app.getPath to return a temp directory
    const { app } = await import("electron")
    vi.mocked(app.getPath).mockReturnValue(tmpdir())
  })

  afterEach(async () => {
    // Clean up database
    const { getDb } = await import("./database")
    try {
      const db = getDb()
      await db.destroy()
    }
    catch {
      // Ignore if db not initialized
    }
  })

  it("should throw when getDb is called before initDatabase", async () => {
    const { getDb } = await import("./database")

    expect(() => getDb()).toThrow("Database not initialized. Call initDatabase() first.")
  })

  it("should initialize database and create tables", async () => {
    const { initDatabase, getDb } = await import("./database")

    await initDatabase()
    const db = getDb()

    expect(db).toBeDefined()

    // Check that stock_quotes table exists
    const hasStockQuotes = await db.schema.hasTable("stock_quotes")
    expect(hasStockQuotes).toBe(true)

    // Check that stock_amounts table exists
    const hasStockAmounts = await db.schema.hasTable("stock_amounts")
    expect(hasStockAmounts).toBe(true)
  })

  it("should be idempotent when called multiple times", async () => {
    const { initDatabase, getDb } = await import("./database")

    await initDatabase()
    await initDatabase()

    const db = getDb()
    expect(db).toBeDefined()

    const hasStockQuotes = await db.schema.hasTable("stock_quotes")
    expect(hasStockQuotes).toBe(true)

    const hasStockAmounts = await db.schema.hasTable("stock_amounts")
    expect(hasStockAmounts).toBe(true)
  })

  it("should create stock_quotes table with correct schema", async () => {
    const { initDatabase, getDb } = await import("./database")

    await initDatabase()
    const db = getDb()

    const columns = await db("stock_quotes").columnInfo()

    expect(columns).toHaveProperty("symbol")
    expect(columns).toHaveProperty("name")
    expect(columns).toHaveProperty("price")
    expect(columns).toHaveProperty("previous_close")
    expect(columns).toHaveProperty("change")
    expect(columns).toHaveProperty("change_percent")
    expect(columns).toHaveProperty("currency")
    expect(columns).toHaveProperty("change_1m")
    expect(columns).toHaveProperty("change_6m")
    expect(columns).toHaveProperty("change_2y")
    expect(columns).toHaveProperty("updated_at")
  })

  it("should create stock_amounts table with correct schema", async () => {
    const { initDatabase, getDb } = await import("./database")

    await initDatabase()
    const db = getDb()

    const columns = await db("stock_amounts").columnInfo()

    expect(columns).toHaveProperty("symbol")
    expect(columns).toHaveProperty("amount")
  })
})
