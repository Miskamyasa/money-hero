import { ActionIcon, Button, Card, Center, Group, NumberInput, Progress, Table, Text, UnstyledButton } from "@mantine/core"

import { useStores } from "@renderer/stores/useStores"
import { observer } from "mobx-react-lite"

import { useCallback, useEffect, useMemo, useState } from "react"

type SortableColumn = "change1m" | "change6m" | "change2y"
type SortDirection = "asc" | "desc"

interface SortState {
  column: SortableColumn | null
  direction: SortDirection
}

function compareSortableValues(a: number | null, b: number | null, direction: SortDirection): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
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

function StocksTable(): React.JSX.Element {
  const { stocks } = useStores()
  const [sortState, setSortState] = useState<SortState>({ column: null, direction: "desc" })

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

  useEffect(() => {
    stocks.loadFromCache()
  }, [stocks])

  const formatPrice = (value: number): string => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
  }

  const formatChange = (value: number): string => {
    const formatted = formatPrice(value)
    return value >= 0 ? `+${formatted}` : formatted
  }

  const formatChangePercent = (value: number): string => {
    const formatted = value.toFixed(2)
    return value >= 0 ? `+${formatted}%` : `${formatted}%`
  }

  const getChangeColor = (value: number): string => {
    return value >= 0 ? "teal" : "red"
  }

  const handleRefresh = (): void => {
    stocks.refreshAll()
  }

  const sortedQuotes = useMemo(() => {
    const quotes = Array.from(stocks.quotes.values())
    if (sortState.column == null) {
      return quotes.sort((a, b) => a.symbol.localeCompare(b.symbol))
    }
    const col = sortState.column
    const dir = sortState.direction
    return quotes.sort((a, b) => {
      const cmp = compareSortableValues(a[col], b[col], dir)
      return cmp !== 0 ? cmp : a.symbol.localeCompare(b.symbol)
    })
  }, [stocks.quotes, sortState])

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Text fw={700} size="lg">Dividend Aristocrats</Text>
        <Button
          variant="light"
          size="xs"
          onClick={handleRefresh}
          loading={stocks.loading}
        >
          Refresh
        </Button>
      </Group>

      {stocks.loading && (
        <>
          <Progress value={stocks.progress * 100} size="sm" mb="xs" />
          <Text size="xs" c="dimmed" mb="md">
            Loading stocks... (
            {stocks.fetchedCount}
            /
            {stocks.totalCount}
            )
          </Text>
        </>
      )}

      {stocks.quotes.size === 0 && !stocks.loading && (
        <Center>
          <Button
            variant="light"
            onClick={handleRefresh}
          >
            Load Stocks
          </Button>
        </Center>
      )}

      {stocks.quotes.size > 0 && (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Symbol</Table.Th>
              <Table.Th>Name</Table.Th>
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
            {sortedQuotes.map(quote => (
              <Table.Tr key={quote.symbol}>
                <Table.Td>{quote.symbol}</Table.Td>
                <Table.Td><Text size="sm" truncate="end" maw={200}>{quote.name}</Text></Table.Td>
                <Table.Td>{formatPrice(quote.price)}</Table.Td>
                <Table.Td>
                  <Text c={getChangeColor(quote.change)}>
                    {formatChange(quote.change)}
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
                <Table.Td>{formatPrice(stocks.getBalance(quote.symbol))}</Table.Td>
                <Table.Td>
                  {stocks.isEditing(quote.symbol)
                    ? (
                        <NumberInput
                          size="xs"
                          value={stocks.getAmount(quote.symbol)}
                          onChange={value => stocks.setAmount(quote.symbol, Number(value) || 0)}
                          min={0}
                          step={1}
                          hideControls
                          styles={{ input: { width: 80 } }}
                        />
                      )
                    : stocks.getAmount(quote.symbol)}
                </Table.Td>
                <Table.Td>
                  <ActionIcon
                    variant={stocks.isEditing(quote.symbol) ? "filled" : "subtle"}
                    size="sm"
                    aria-label={stocks.isEditing(quote.symbol) ? "Stop editing" : "Edit amount"}
                    onClick={() => stocks.isEditing(quote.symbol) ? stocks.stopEditing() : stocks.startEditing(quote.symbol)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="tabler-icon tabler-icon-pencil "><path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4"></path><path d="M13.5 6.5l4 4"></path></svg>
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Card>
  )
}

const StocksTableObserver = observer(StocksTable)
export default StocksTableObserver
