import type { Knex } from "knex"
import type { StockQuote } from "./stocks"

import knex from "knex"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Mock the database module
vi.mock("./database", () => {
  let testDb: Knex | null = null

  return {
    getDb: vi.fn(() => {
      if (!testDb) {
        throw new Error("Test database not initialized")
      }
      return testDb
    }),
    __setTestDb: (db: Knex | null) => {
      testDb = db
    },
  }
})

describe("repositories", () => {
  let testDb: Knex

  beforeEach(async () => {
    // Create in-memory SQLite database
    testDb = knex({
      client: "better-sqlite3",
      connection: {
        filename: ":memory:",
      },
      useNullAsDefault: true,
    })

    // Create the same schema as database.ts
    await testDb.schema.createTable("stock_quotes", (table) => {
      table.string("symbol").primary()
      table.string("name").notNullable()
      table.float("price").notNullable()
      table.float("previous_close").notNullable()
      table.float("change").notNullable()
      table.float("change_percent").notNullable()
      table.string("currency").notNullable()
      table.float("change_1m").nullable()
      table.float("change_6m").nullable()
      table.float("change_2y").nullable()
      table.text("dividends").nullable()
      table.integer("updated_at").notNullable()
    })

    await testDb.schema.createTable("stock_amounts", (table) => {
      table.string("symbol").primary()
      table.float("amount").notNullable()
    })

    // Set the test database in the mock
    const db = await import("./database")
    // @ts-expect-error __setTestDb is only available in the mock
    db.__setTestDb(testDb)
  })

  afterEach(async () => {
    const db = await import("./database")
    // @ts-expect-error __setTestDb is only available in the mock
    db.__setTestDb(null)
    await testDb.destroy()
  })

  describe("getStockQuotesCache", () => {
    it("should return empty array when no data", async () => {
      const { getStockQuotesCache } = await import("./repositories")

      const result = await getStockQuotesCache()

      expect(result).toEqual([])
    })

    it("should return quotes when data is fresh", async () => {
      const { getStockQuotesCache } = await import("./repositories")

      const now = Date.now()
      await testDb("stock_quotes").insert({
        symbol: "ABBV",
        name: "AbbVie Inc.",
        price: 175.50,
        previous_close: 173.25,
        change: 2.25,
        change_percent: 1.2987,
        currency: "USD",
        change_1m: 0.5,
        change_6m: 2.0,
        change_2y: 25.0,
        updated_at: now,
      })

      const result = await getStockQuotesCache()

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        symbol: "ABBV",
        name: "AbbVie Inc.",
        price: 175.50,
        previousClose: 173.25,
        change: 2.25,
        changePercent: 1.2987,
        currency: "USD",
        change1m: 0.5,
        change6m: 2.0,
        change2y: 25.0,
        dividends: [],
      })
    })

    it("should return empty array when data is expired", async () => {
      const { getStockQuotesCache } = await import("./repositories")

      const oneHourAgo = Date.now() - (60 * 60 * 1000) - 1000
      await testDb("stock_quotes").insert({
        symbol: "ABBV",
        name: "AbbVie Inc.",
        price: 175.50,
        previous_close: 173.25,
        change: 2.25,
        change_percent: 1.2987,
        currency: "USD",
        change_1m: 0.5,
        change_6m: 2.0,
        change_2y: 25.0,
        updated_at: oneHourAgo,
      })

      const result = await getStockQuotesCache()

      expect(result).toEqual([])
    })

    it("should return multiple quotes when all are fresh", async () => {
      const { getStockQuotesCache } = await import("./repositories")

      const now = Date.now()
      await testDb("stock_quotes").insert([
        {
          symbol: "ABBV",
          name: "AbbVie Inc.",
          price: 175.50,
          previous_close: 173.25,
          change: 2.25,
          change_percent: 1.2987,
          currency: "USD",
          change_1m: 0.5,
          change_6m: 2.0,
          change_2y: 25.0,
          updated_at: now,
        },
        {
          symbol: "ABT",
          name: "Abbott Laboratories",
          price: 120.00,
          previous_close: 119.00,
          change: 1.00,
          change_percent: 0.84,
          currency: "USD",
          change_1m: null,
          change_6m: null,
          change_2y: null,
          updated_at: now,
        },
      ])

      const result = await getStockQuotesCache()

      expect(result).toHaveLength(2)
      expect(result[0].symbol).toBe("ABBV")
      expect(result[1].symbol).toBe("ABT")
    })
  })

  describe("saveStockQuotesCache", () => {
    it("should insert new quotes", async () => {
      const { saveStockQuotesCache } = await import("./repositories")

      const quotes: StockQuote[] = [
        {
          symbol: "ABBV",
          name: "AbbVie Inc.",
          price: 175.50,
          previousClose: 173.25,
          change: 2.25,
          changePercent: 1.2987,
          currency: "USD",
          change1m: 0.5,
          change6m: 2.0,
          change2y: 25.0,
          dividends: [{ amount: 1.41, date: 1700000000 }],
        },
      ]

      await saveStockQuotesCache(quotes)

      const rows = await testDb("stock_quotes").select("*")
      expect(rows).toHaveLength(1)
      expect(rows[0].symbol).toBe("ABBV")
      expect(rows[0].price).toBe(175.50)
      expect(rows[0].dividends).toBe(JSON.stringify([{ amount: 1.41, date: 1700000000 }]))
    })

    it("should upsert existing quotes", async () => {
      const { saveStockQuotesCache } = await import("./repositories")

      const now = Date.now()
      await testDb("stock_quotes").insert({
        symbol: "ABBV",
        name: "AbbVie Inc.",
        price: 175.50,
        previous_close: 173.25,
        change: 2.25,
        change_percent: 1.2987,
        currency: "USD",
        change_1m: 0.5,
        change_6m: 2.0,
        change_2y: 25.0,
        dividends: JSON.stringify([]),
        updated_at: now,
      })

      const updatedQuotes: StockQuote[] = [
        {
          symbol: "ABBV",
          name: "AbbVie Inc.",
          price: 180.00,
          previousClose: 175.50,
          change: 4.50,
          changePercent: 2.5641,
          currency: "USD",
          change1m: 1.0,
          change6m: 3.0,
          change2y: 28.0,
          dividends: [{ amount: 1.50, date: 1710000000 }],
        },
      ]

      await saveStockQuotesCache(updatedQuotes)

      const rows = await testDb("stock_quotes").select("*")
      expect(rows).toHaveLength(1)
      expect(rows[0].symbol).toBe("ABBV")
      expect(rows[0].price).toBe(180.00)
      expect(rows[0].previous_close).toBe(175.50)
      expect(rows[0].dividends).toBe(JSON.stringify([{ amount: 1.50, date: 1710000000 }]))
    })

    it("should round-trip dividends through save and load", async () => {
      const { getStockQuotesCache, saveStockQuotesCache } = await import("./repositories")

      const dividends = [
        { amount: 1.41, date: 1690000000 },
        { amount: 1.41, date: 1700000000 },
      ]

      await saveStockQuotesCache([{
        symbol: "ABBV",
        name: "AbbVie Inc.",
        price: 175.50,
        previousClose: 173.25,
        change: 2.25,
        changePercent: 1.2987,
        currency: "USD",
        change1m: 0.5,
        change6m: 2.0,
        change2y: 25.0,
        dividends,
      }])

      const result = await getStockQuotesCache()

      expect(result).toHaveLength(1)
      expect(result[0].dividends).toEqual(dividends)
    })
  })

  describe("clearStockQuotesCache", () => {
    it("should remove all cached quotes", async () => {
      const { clearStockQuotesCache } = await import("./repositories")

      const now = Date.now()
      await testDb("stock_quotes").insert([
        {
          symbol: "ABBV",
          name: "AbbVie Inc.",
          price: 175.50,
          previous_close: 173.25,
          change: 2.25,
          change_percent: 1.2987,
          currency: "USD",
          change_1m: 0.5,
          change_6m: 2.0,
          change_2y: 25.0,
          updated_at: now,
        },
        {
          symbol: "ABT",
          name: "Abbott Laboratories",
          price: 120.00,
          previous_close: 119.00,
          change: 1.00,
          change_percent: 0.84,
          currency: "USD",
          change_1m: null,
          change_6m: null,
          change_2y: null,
          updated_at: now,
        },
      ])

      await clearStockQuotesCache()

      const rows = await testDb("stock_quotes").select("*")
      expect(rows).toHaveLength(0)
    })
  })

  describe("getStockAmounts", () => {
    it("should return empty object when no data", async () => {
      const { getStockAmounts } = await import("./repositories")

      const result = await getStockAmounts()

      expect(result).toEqual({})
    })

    it("should return saved amounts", async () => {
      const { getStockAmounts } = await import("./repositories")

      await testDb("stock_amounts").insert([
        { symbol: "ABBV", amount: 10.5 },
        { symbol: "ABT", amount: 25.0 },
      ])

      const result = await getStockAmounts()

      expect(result).toEqual({
        ABBV: 10.5,
        ABT: 25.0,
      })
    })
  })

  describe("setStockAmount", () => {
    it("should insert new amount", async () => {
      const { setStockAmount } = await import("./repositories")

      await setStockAmount("ABBV", 10.5)

      const rows = await testDb("stock_amounts").select("*")
      expect(rows).toHaveLength(1)
      expect(rows[0].symbol).toBe("ABBV")
      expect(rows[0].amount).toBe(10.5)
    })

    it("should update existing amount", async () => {
      const { setStockAmount } = await import("./repositories")

      await testDb("stock_amounts").insert({ symbol: "ABBV", amount: 10.5 })

      await setStockAmount("ABBV", 15.0)

      const rows = await testDb("stock_amounts").select("*")
      expect(rows).toHaveLength(1)
      expect(rows[0].symbol).toBe("ABBV")
      expect(rows[0].amount).toBe(15.0)
    })

    it("should delete row when amount is 0", async () => {
      const { setStockAmount } = await import("./repositories")

      await testDb("stock_amounts").insert({ symbol: "ABBV", amount: 10.5 })

      await setStockAmount("ABBV", 0)

      const rows = await testDb("stock_amounts").select("*")
      expect(rows).toHaveLength(0)
    })
  })
})
