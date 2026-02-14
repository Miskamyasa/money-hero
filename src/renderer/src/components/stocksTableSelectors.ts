export type SortableColumn = "change1m" | "change6m" | "change2y"
export type SortDirection = "asc" | "desc"

export interface SortState {
  column: SortableColumn | null
  direction: SortDirection
}

interface SortableQuote {
  symbol: string
  name: string
  change1m: number | null
  change6m: number | null
  change2y: number | null
}

function compareSortableValues(a: number | null, b: number | null, direction: SortDirection): number {
  if (a == null && b == null)
    return 0
  if (a == null)
    return 1
  if (b == null)
    return -1
  return direction === "asc" ? a - b : b - a
}

export function selectSortedQuotes<T extends SortableQuote>(quotes: T[], filter: string, sortState: SortState): T[] {
  const filterLower = filter.toLowerCase().trim()
  const filtered = quotes.filter((q) => {
    if (!filterLower)
      return true
    return q.symbol.toLowerCase().includes(filterLower)
      || q.name.toLowerCase().includes(filterLower)
  })

  if (sortState.column == null) {
    return filtered.sort((a, b) => a.symbol.localeCompare(b.symbol))
  }

  const col = sortState.column
  const dir = sortState.direction
  return filtered.sort((a, b) => {
    const cmp = compareSortableValues(a[col], b[col], dir)
    return cmp !== 0 ? cmp : a.symbol.localeCompare(b.symbol)
  })
}
