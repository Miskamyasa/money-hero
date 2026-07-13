import {useCallback, useRef, useState} from "react"

import {
  ActionIcon,
  Button,
  Card,
  Center,
  Collapse,
  Group,
  HoverCard,
  NumberInput,
  Table,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from "@mantine/core"
import {useDebouncedCallback} from "@mantine/hooks"
import {observer} from "mobx-react-lite"

import type {StocksStore} from "@renderer/stores/StocksStore"
import {useStores} from "@renderer/stores/useStores"
import {formatChangePercent, formatPrice, formatSharePercent, getChangeColor} from "@renderer/utils/quoteFormatters"

import {slicePointsByMonths, Sparkline} from "./Sparkline"
import type {SortableColumn, SortState} from "./stocksTableSelectors"
import {selectSortedQuotes} from "./stocksTableSelectors"

type StocksTableProps = {
  store: StocksStore,
  title: string,
}

function SortableHeader({label, column, sortState, onSort}: {
  label: string,
  column: SortableColumn,
  sortState: SortState,
  onSort: (column: SortableColumn) => void,
}): React.JSX.Element {
  const isActive = sortState.column === column
  const arrow = isActive ? (sortState.direction === "asc" ? " \u2191" : " \u2193") : ""

  return (
    <UnstyledButton
      style={{fontWeight: 700}}
      onClick={() => {
        onSort(column)
      }}>
      {label}
      {arrow}
    </UnstyledButton>
  )
}

function StocksTableImpl({store: stocks, title}: StocksTableProps): React.JSX.Element {
  const root = useStores()
  const data = stocks.data
  const ui = stocks.ui
  const allocationStore = stocks.allocation
  const [sortState, setSortState] = useState<SortState>({column: null, direction: "desc"})
  const [filterInput, setFilterInput] = useState("")
  const [debouncedFilter, setDebouncedFilter] = useState("")

  const debouncedSetFilter = useDebouncedCallback((value: string): void => {
    setDebouncedFilter(value)
  }, 300)

  const handleFilterChange = useCallback((value: string): void => {
    setFilterInput(value)
    debouncedSetFilter(value)
  }, [debouncedSetFilter])

  const handleSort = useCallback((column: SortableColumn): void => {
    setSortState((prev) => {
      if (prev.column !== column) {
        return {column, direction: "desc"}
      }
      if (prev.direction === "desc") {
        return {column, direction: "asc"}
      }
      return {column: null, direction: "desc"}
    })
  }, [])

  const investmentInputRef = useRef<HTMLInputElement>(null)
  const [localAmount, setLocalAmount] = useState<number | string>("")

  const debouncedSetInvestmentAmount = useDebouncedCallback((value: number | string): void => {
    ui.setInvestmentAmount(Number(value) || 0)
  }, 500)

  const handleAmountChange = useCallback((value: number | string): void => {
    setLocalAmount(value)
    debouncedSetInvestmentAmount(value)
  }, [debouncedSetInvestmentAmount])

  const handleToggleBuy = useCallback((): void => {
    const wasOff = !ui.buyingMode
    ui.toggleBuyingMode()

    if (wasOff) {
      setLocalAmount(ui.investmentAmount === 0 ? "" : ui.investmentAmount)
      requestAnimationFrame(() => {
        investmentInputRef.current?.focus()
      })
      return
    }

    setLocalAmount("")
  }, [ui])

  const formatDividendYield = (symbol: string): string => {
    const yieldValue = data.getDividendYield(symbol, 24)
    if (yieldValue == null) {
      return "No dividends"
    }
    return `Div yield: ${yieldValue.toFixed(2)}% ann.`
  }

  const sortedQuotes = selectSortedQuotes([...stocks.activeQuotes], debouncedFilter, sortState)

  return (
    <Card
      withBorder
      padding="lg"
      radius="md"
      shadow="sm">
      <Group
        justify="space-between"
        mb="md">
        <Group gap="sm">
          <Text
            fw={700}
            size="lg">{title}</Text>
          {stocks.totalActiveBalanceIls > 0 && (
            <Text
              c="dimmed"
              size="sm">{formatPrice(stocks.totalActiveBalanceIls, "ILS")}</Text>
          )}
        </Group>
        <Group
          display="flex"
          flex="1"
          gap="sm"
          justify="flex-end">
          <TextInput
            placeholder="Filter by name or symbol"
            size="xs"
            styles={{input: {width: 180}}}
            value={filterInput}
            onChange={e => {
              handleFilterChange(e.currentTarget.value)
            }}/>
          <NumberInput
            ref={investmentInputRef}
            hideControls
            disabled={!ui.buyingMode}
            min={0}
            placeholder="Amount"
            prefix="$"
            size="xs"
            styles={{input: {width: 120}}}
            thousandSeparator=","
            value={localAmount}
            onChange={handleAmountChange}/>
          <Button
            color={ui.buyingMode ? "teal" : undefined}
            size="xs"
            variant={ui.buyingMode ? "filled" : "light"}
            onClick={handleToggleBuy}>
            Buy
          </Button>
          <Button
            size="xs"
            variant="light"
            onClick={() => {
              ui.toggleTableVisible()
            }}>
            {ui.tableVisible ? "Hide" : "Show"}
          </Button>
        </Group>
      </Group>

      <Collapse expanded={ui.tableVisible}>
        {data.quotes.size === 0 && !root.fetchQueue.running && (
          <Center>
            <Button
              variant="light"
              onClick={() => {
                stocks.load()
              }}>
              Load Stocks
            </Button>
          </Center>
        )}

        {data.quotes.size > 0 && (
          <Table
            highlightOnHover
            striped
            styles={{
              td: {fontSize: "14px"},
              th: {fontSize: "14px"},
            }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Symbol</Table.Th>
                <Table.Th>Price</Table.Th>
                <Table.Th><SortableHeader
                  column="change1m"
                  label="1M"
                  sortState={sortState}
                  onSort={handleSort} /></Table.Th>
                <Table.Th><SortableHeader
                  column="change6m"
                  label="6M"
                  sortState={sortState}
                  onSort={handleSort} /></Table.Th>
                <Table.Th><SortableHeader
                  column="change2y"
                  label="2Y"
                  sortState={sortState}
                  onSort={handleSort} /></Table.Th>
                <Table.Th>Balance</Table.Th>
                <Table.Th>Share</Table.Th>
                <Table.Th>Weight</Table.Th>
                <Table.Th>Amount</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sortedQuotes.map((quote) => {
                const allocation = allocationStore.getAllocation(quote.symbol)
                const allocationBalance = allocationStore.getAllocationBalance(quote.symbol)

                return (
                  <Table.Tr key={quote.symbol}>
                    <Table.Td>
                      <Tooltip
                        withArrow
                        label={quote.name}>
                        <Text
                          inherit
                          style={{cursor: "default"}}>{quote.symbol}</Text>
                      </Tooltip>
                    </Table.Td>
                    <Table.Td>
                      <Tooltip
                        withArrow
                        label={formatDividendYield(quote.symbol)}>
                        <span>{formatPrice(quote.price, quote.currency)}</span>
                      </Tooltip>
                    </Table.Td>
                    <Table.Td>
                      <HoverCard
                        openDelay={300}
                        shadow="md"
                        width={270}>
                        <HoverCard.Target>
                          {quote.change1m != null
                            ? (
                              <Text
                                inherit
                                c={getChangeColor(quote.change1m)}
                                style={{cursor: "default"}}>
                                {formatChangePercent(quote.change1m)}
                              </Text>
                            )
                            : (
                              <Text
                                inherit
                                c="dimmed"
                                style={{cursor: "default"}}>
                                N/A
                              </Text>
                            )}
                        </HoverCard.Target>
                        <HoverCard.Dropdown p="sm">
                          <Text
                            c="dimmed"
                            mb={4}
                            size="xs">
                            {quote.symbol}
                            {" \u2014 1 month"}
                          </Text>
                          <Sparkline points={slicePointsByMonths(quote.historyPoints ?? [], 1)} />
                        </HoverCard.Dropdown>
                      </HoverCard>
                    </Table.Td>
                    <Table.Td>
                      <HoverCard
                        openDelay={300}
                        shadow="md"
                        width={270}>
                        <HoverCard.Target>
                          {quote.change6m != null
                            ? (
                              <Text
                                inherit
                                c={getChangeColor(quote.change6m)}
                                style={{cursor: "default"}}>
                                {formatChangePercent(quote.change6m)}
                              </Text>
                            )
                            : (
                              <Text
                                inherit
                                c="dimmed"
                                style={{cursor: "default"}}>
                                N/A
                              </Text>
                            )}
                        </HoverCard.Target>
                        <HoverCard.Dropdown p="sm">
                          <Text
                            c="dimmed"
                            mb={4}
                            size="xs">
                            {quote.symbol}
                            {" — 6 months"}
                          </Text>
                          <Sparkline points={slicePointsByMonths(quote.historyPoints ?? [], 6)} />
                        </HoverCard.Dropdown>
                      </HoverCard>
                    </Table.Td>
                    <Table.Td>
                      <HoverCard
                        openDelay={300}
                        shadow="md"
                        width={270}>
                        <HoverCard.Target>
                          {quote.change2y != null
                            ? (
                              <Text
                                inherit
                                c={getChangeColor(quote.change2y)}
                                style={{cursor: "default"}}>
                                {formatChangePercent(quote.change2y)}
                              </Text>
                            )
                            : (
                              <Text
                                inherit
                                c="dimmed"
                                style={{cursor: "default"}}>
                                N/A
                              </Text>
                            )}
                        </HoverCard.Target>
                        <HoverCard.Dropdown p="sm">
                          <Text
                            c="dimmed"
                            mb={4}
                            size="xs">
                            {quote.symbol}
                            {" \u2014 2 years"}
                          </Text>
                          <Sparkline points={slicePointsByMonths(quote.historyPoints ?? [], 24)} />
                        </HoverCard.Dropdown>
                      </HoverCard>
                    </Table.Td>
                    <Table.Td style={{position: "relative"}}>
                      {formatPrice(data.getBalance(quote.symbol), quote.currency)}
                      {ui.buyingMode && allocationBalance > 0 && (
                        <Text
                          inherit
                          c="teal"
                          fw={700}
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: 0,
                            right: 0,
                            transform: "translateY(-50%)",
                            textAlign: "center",
                            backgroundColor: "var(--mantine-color-body)",
                            padding: "0 4px",
                          }}>
                          {formatPrice(allocationBalance, quote.currency)}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {(() => {
                        const positionBalance = data.getBalance(quote.symbol)
                        const tableTotal = stocks.totalActiveBalanceIls
                        const positionBalanceIls = root.currency.convertToIls(positionBalance, quote.currency)
                        if (positionBalanceIls == null || tableTotal <= 0 || positionBalanceIls <= 0) {
                          return (
                            <Text
                              inherit
                              c="dimmed">—</Text>
                          )
                        }
                        return <Text inherit>{formatSharePercent(positionBalanceIls / tableTotal)}</Text>
                      })()}
                    </Table.Td>
                    <Table.Td>
                      {(() => {
                        const hasWeight = root.stockTargetWeights.hasWeight(quote.symbol)
                        const weightValue = hasWeight ? root.stockTargetWeights.getWeight(quote.symbol) : ""
                        return (
                          <NumberInput
                            hideControls
                            allowDecimal={false}
                            allowLeadingZeros={false}
                            allowNegative={false}
                            clampBehavior="strict"
                            disabled={!ui.isEditing(quote.symbol)}
                            max={100}
                            min={1}
                            placeholder="—"
                            size="xs"
                            step={1}
                            styles={{
                              input: {
                                width: 64,
                                fontSize: "14px",
                                ...(hasWeight && !ui.isEditing(quote.symbol) && {
                                  color: "var(--mantine-color-blue-filled)",
                                  fontWeight: 700,
                                  opacity: 1,
                                }),
                              },
                            }}
                            value={weightValue}
                            onChange={value => {
                              const numeric = Number(value)
                              if (!Number.isFinite(numeric) || numeric < 1) return
                              const clamped = Math.min(100, Math.max(1, Math.round(numeric)))
                              root.stockTargetWeights.setWeight(quote.symbol, clamped)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") ui.stopEditing()
                            }}/>
                        )
                      })()}
                    </Table.Td>
                    <Table.Td style={{position: "relative"}}>
                      <NumberInput
                        hideControls
                        allowDecimal={false}
                        allowLeadingZeros={false}
                        allowNegative={false}
                        clampBehavior="strict"
                        disabled={!ui.isEditing(quote.symbol)}
                        min={0}
                        size="xs"
                        step={1}
                        styles={{
                          input: {
                            width: 80,
                            fontSize: "14px",
                            ...(data.getAmount(quote.symbol) !== 0 && !ui.isEditing(quote.symbol) && {
                              color: "var(--mantine-color-blue-filled)",
                              fontWeight: 700,
                              opacity: 1,
                            }),
                          },
                        }}
                        value={data.getAmount(quote.symbol)}
                        onChange={value => {
                          data.setAmount(quote.symbol, Number(value) || 0)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") ui.stopEditing()
                        }}/>
                      {ui.buyingMode && allocation > 0 && (
                        <Text
                          inherit
                          c="teal"
                          fw={700}
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: 0,
                            right: 0,
                            transform: "translateY(-50%)",
                            textAlign: "center",
                            backgroundColor: "var(--mantine-color-body)",
                            padding: "0 4px",
                          }}>
                          +
                          {allocation}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Group
                        gap={4}
                        wrap="nowrap">
                        <ActionIcon
                          aria-label={ui.isEditing(quote.symbol) ? "Stop editing" : "Edit amount"}
                          size="sm"
                          variant={ui.isEditing(quote.symbol) ? "filled" : "subtle"}
                          onClick={() => {
                            if (ui.isEditing(quote.symbol)) {
                              ui.stopEditing()
                            }
                            else {
                              ui.startEditing(quote.symbol)
                            }
                          }}>
                          <svg
                            fill="none"
                            height="14"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.5"
                            viewBox="0 0 24 24"
                            width="14"
                            xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4" />
                            <path d="M13.5 6.5l4 4" />
                          </svg>
                        </ActionIcon>
                        <ActionIcon
                          aria-label="Open on Yahoo Finance"
                          component="a"
                          href={`https://finance.yahoo.com/quote/${quote.symbol}/`}
                          rel="noopener noreferrer"
                          size="sm"
                          target="_blank"
                          variant="subtle">
                          <svg
                            fill="none"
                            height="14"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.5"
                            viewBox="0 0 24 24"
                            width="14"
                            xmlns="http://www.w3.org/2000/svg">
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

export const StocksTable = observer(StocksTableImpl)
