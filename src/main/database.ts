import type { Knex } from "knex"

import { join } from "node:path"
import { app } from "electron"
import knex from "knex"

let db: Knex | null = null

export async function initDatabase(): Promise<void> {
  const dbPath = join(app.getPath("userData"), "money-hero.db")

  db = knex({
    client: "better-sqlite3",
    connection: {
      filename: dbPath,
    },
    useNullAsDefault: true,
  })

  // Create stock_quotes table
  const hasStockQuotes = await db.schema.hasTable("stock_quotes")
  if (!hasStockQuotes) {
    await db.schema.createTable("stock_quotes", (table) => {
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
  }
  else {
    const hasDividends = await db.schema.hasColumn("stock_quotes", "dividends")
    if (!hasDividends) {
      await db.schema.alterTable("stock_quotes", (table) => {
        table.text("dividends").nullable()
      })
    }
  }

  // Create stock_amounts table
  const hasStockAmounts = await db.schema.hasTable("stock_amounts")
  if (!hasStockAmounts) {
    await db.schema.createTable("stock_amounts", (table) => {
      table.string("symbol").primary()
      table.float("amount").notNullable()
    })
  }
}

export function getDb(): Knex {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.")
  }
  return db
}
