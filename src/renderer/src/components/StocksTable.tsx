import type { StocksStore } from "@renderer/stores/StocksStore"

import { ActionIcon, Button, Card, Center, Collapse, Group, NumberInput, Progress, Table, Text, TextInput, Tooltip, UnstyledButton } from "@mantine/core"

import { observer } from "mobx-react-lite"

import { useCallback, useEffect, useRef, useState } from "react"

type SortableColumn = "change1m" | "change6m" | "change2y"
type SortDirection = "asc" | "desc"

interface StocksTableProps {
  store: StocksStore
  title: string
}

interface SortState {
  column: SortableColumn | null
  direction: SortDirection
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

function SortableHeader({ label, column, sortState, onSort }: {
  label: string
  column: SortableColumn
  sortState: SortState
  onSort: (column: SortableColumn) => void
}): React.JSX.Element {
  const isActive = sortState.column === column
  const arrow = isActive ? (sortState.direction === "asc" ? " \u2191" : " \u2193") : ""

  return (
    <UnstyledButton onClick={() => onSort(column)} style={{ fontWeight: 700 }}>
      {label}
      {arrow}
    </UnstyledButton>
  )
}

function StocksTable({ store: stocks, title }: StocksTableProps): React.JSX.Element {
  const data = stocks.data
  const ui = stocks.ui
  const allocationStore = stocks.allocation
  const [sortState, setSortState] = useState<SortState>({ column: null, direction: "desc" })
  const [filterInput, setFilterInput] = useState("")
  const [debouncedFilter, setDebouncedFilter] = useState("")
  const [tableVisible, setTableVisible] = useState(true)
  const filterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleFilterChange = useCallback((value: string): void => {
    setFilterInput(value)
    if (filterDebounceRef.current) {
      clearTimeout(filterDebounceRef.current)
    }
    filterDebounceRef.current = setTimeout(() => {
      setDebouncedFilter(value)
    }, 300)
  }, [])

  useEffect(() => {
    return () => {
      if (filterDebounceRef.current) {
        clearTimeout(filterDebounceRef.current)
      }
    }
  }, [])

  const handleSort = useCallback((column: SortableColumn): void => {
    setSortState((prev) => {
      if (prev.column !== column) {
        return { column, direction: "desc" }
      }
      if (prev.direction === "desc") {
        return { column, direction: "asc" }
      }
      return { column: null, direction: "desc" }
    })
  }, [])

  const [localAmount, setLocalAmount] = useState<number | string>("")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleAmountChange = useCallback((value: number | string): void => {
    setLocalAmount(value)
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      ui.setInvestmentAmount(Number(value) || 0)
    }, 500)
  }, [ui])

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  const handleToggleBuy = useCallback((): void => {
    ui.toggleBuyingMode()
    if (!ui.buyingMode) {
      setLocalAmount("")
    }
  }, [ui])

  useEffect(() => {
    void ui.loadDisabledSymbols()
    void data.loadFromCache()
    void data.loadAmounts()
  }, [data, ui])

  const formatPrice = (value: number, currency = "USD"): string => {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value)
    }
    catch {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
    }
  }

  const formatChange = (value: number, currency = "USD"): string => {
    const formatted = formatPrice(value, currency)
    return value >= 0 ? `+${formatted}` : formatted
  }

  const formatChangePercent = (value: number): string => {
    const formatted = value.toFixed(2)
    return value >= 0 ? `+${formatted}%` : `${formatted}%`
  }

  const getChangeColor = (value: number): string => {
    return value >= 0 ? "teal" : "red"
  }

  const formatDividendYield = (symbol: string): string => {
    const yieldValue = data.getDividendYield(symbol, 24)
    if (yieldValue == null) {
      return "No dividends"
    }
    return `Div yield: ${yieldValue.toFixed(2)}% ann.`
  }

  const handleRefresh = (): void => {
    void data.refreshAll()
  }

  const filterLower = debouncedFilter.toLowerCase().trim()
  const sortedQuotes = [...stocks.activeQuotes]
    .filter((q) => {
      if (!filterLower)
        return true
      return q.symbol.toLowerCase().includes(filterLower)
        || q.name.toLowerCase().includes(filterLower)
    })
  if (sortState.column == null) {
    sortedQuotes.sort((a, b) => a.symbol.localeCompare(b.symbol))
  }
  else {
    const col = sortState.column
    const dir = sortState.direction
    sortedQuotes.sort((a, b) => {
      const cmp = compareSortableValues(a[col], b[col], dir)
      return cmp !== 0 ? cmp : a.symbol.localeCompare(b.symbol)
    })
  }

  const allocations = allocationStore.allocations

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Group gap="sm">
          <Text fw={700} size="lg">{title}</Text>
          <TextInput
            size="xs"
            placeholder="Filter by name or symbol"
            value={filterInput}
            onChange={e => handleFilterChange(e.currentTarget.value)}
            styles={{ input: { width: 180 } }}
          />
        </Group>
        <Group gap="sm">
          <NumberInput
            size="xs"
            placeholder="Amount"
            prefix="$"
            min={0}
            thousandSeparator=","
            hideControls
            disabled={!ui.buyingMode}
            value={localAmount}
            onChange={handleAmountChange}
            styles={{ input: { width: 120 } }}
          />
          <Button
            variant={ui.buyingMode ? "filled" : "light"}
            color={ui.buyingMode ? "teal" : undefined}
            size="xs"
            onClick={handleToggleBuy}
          >
            buy
          </Button>
          <Button
            variant="light"
            size="xs"
            onClick={handleRefresh}
            loading={data.loading}
          >
            Refresh
          </Button>
          <Button
            variant="light"
            size="xs"
            onClick={() => setTableVisible(prev => !prev)}
          >
            {tableVisible ? "Hide" : "Show"}
          </Button>
        </Group>
      </Group>

      <Collapse in={tableVisible}>
        {data.loading && (
          <>
            <Progress value={data.progress * 100} size="sm" mb="xs" />
            <Text size="xs" c="dimmed" mb="md">
              Loading stocks... (
              {data.fetchedCount}
              /
              {data.totalCount}
              )
            </Text>
          </>
        )}

        {data.quotes.size === 0 && !data.loading && (
          <Center>
            <Button
              variant="light"
              onClick={handleRefresh}
            >
              Load Stocks
            </Button>
          </Center>
        )}

        {data.quotes.size > 0 && (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Symbol</Table.Th>
                <Table.Th>Currency</Table.Th>
                <Table.Th>Price</Table.Th>
                <Table.Th>Change</Table.Th>
                <Table.Th>Change %</Table.Th>
                <Table.Th><SortableHeader label="1M" column="change1m" sortState={sortState} onSort={handleSort} /></Table.Th>
                <Table.Th><SortableHeader label="6M" column="change6m" sortState={sortState} onSort={handleSort} /></Table.Th>
                <Table.Th><SortableHeader label="2Y" column="change2y" sortState={sortState} onSort={handleSort} /></Table.Th>
                <Table.Th>Balance</Table.Th>
                <Table.Th>Amount</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sortedQuotes.map((quote) => {
                const allocation = allocations.get(quote.symbol) ?? 0
                const allocationBalance = allocation * quote.price

                return (
                  <Table.Tr key={quote.symbol}>
                    <Table.Td>
                      <Tooltip label={quote.name} withArrow>
                        <Text size="sm" style={{ cursor: "default" }}>{quote.symbol}</Text>
                      </Tooltip>
                    </Table.Td>
                    <Table.Td><Text size="sm">{quote.currency}</Text></Table.Td>
                    <Table.Td>
                      <Tooltip label={formatDividendYield(quote.symbol)} withArrow>
                        <span>{formatPrice(quote.price, quote.currency)}</span>
                      </Tooltip>
                    </Table.Td>
                    <Table.Td>
                      <Text c={getChangeColor(quote.change)}>
                        {formatChange(quote.change, quote.currency)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text c={getChangeColor(quote.changePercent)}>
                        {formatChangePercent(quote.changePercent)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {quote.change1m != null
                        ? (
                            <Text c={getChangeColor(quote.change1m)}>
                              {formatChangePercent(quote.change1m)}
                            </Text>
                          )
                        : <Text c="dimmed">N/A</Text>}
                    </Table.Td>
                    <Table.Td>
                      {quote.change6m != null
                        ? (
                            <Text c={getChangeColor(quote.change6m)}>
                              {formatChangePercent(quote.change6m)}
                            </Text>
                          )
                        : <Text c="dimmed">N/A</Text>}
                    </Table.Td>
                    <Table.Td>
                      {quote.change2y != null
                        ? (
                            <Text c={getChangeColor(quote.change2y)}>
                              {formatChangePercent(quote.change2y)}
                            </Text>
                          )
                        : <Text c="dimmed">N/A</Text>}
                    </Table.Td>
                    <Table.Td style={{ position: "relative" }}>
                      {formatPrice(data.getBalance(quote.symbol), quote.currency)}
                      {ui.buyingMode && allocationBalance > 0 && (
                        <Text
                          size="sm"
                          fw={700}
                          c="teal"
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: 0,
                            right: 0,
                            transform: "translateY(-50%)",
                            textAlign: "center",
                            backgroundColor: "var(--mantine-color-dark-7)",
                            padding: "0 4px",
                          }}
                        >
                          {formatPrice(allocationBalance, quote.currency)}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td style={{ position: "relative" }}>
                      <NumberInput
                        size="xs"
                        value={data.getAmount(quote.symbol)}
                        onChange={value => data.setAmount(quote.symbol, Number(value) || 0)}
                        min={0}
                        step={1}
                        hideControls
                        disabled={!ui.isEditing(quote.symbol)}
                        styles={{ input: { width: 80 } }}
                      />
                      {ui.buyingMode && allocation > 0 && (
                        <Text
                          size="sm"
                          fw={700}
                          c="teal"
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: 0,
                            right: 0,
                            transform: "translateY(-50%)",
                            textAlign: "center",
                            backgroundColor: "var(--mantine-color-dark-7)",
                            padding: "0 4px",
                          }}
                        >
                          +
                          {allocation}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} wrap="nowrap">
                        <ActionIcon
                          variant={ui.isEditing(quote.symbol) ? "filled" : "subtle"}
                          size="sm"
                          aria-label={ui.isEditing(quote.symbol) ? "Stop editing" : "Edit amount"}
                          onClick={() => ui.isEditing(quote.symbol) ? ui.stopEditing() : ui.startEditing(quote.symbol)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4" />
                            <path d="M13.5 6.5l4 4" />
                          </svg>
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          size="sm"
                          aria-label="Open on Yahoo Finance"
                          component="a"
                          href={`https://finance.yahoo.com/quote/${quote.symbol}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6" />
                            <path d="M11 13l9 -9" />
                            <path d="M15 4h5v5" />
                          </svg>
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                )
              })}
            </Table.Tbody>
          </Table>
        )}
      </Collapse>
    </Card>
  )
}

const StocksTableObserver = observer(StocksTable)
export default StocksTableObserver
