import type { SymbolStore } from "@renderer/stores/SymbolStore"

import { ActionIcon, Card, Group, NumberInput, Paper, Stack, Text } from "@mantine/core"
import { formatChange, formatChangePercent, formatPrice, getChangeColor } from "@renderer/utils/quoteFormatters"
import { observer } from "mobx-react-lite"

interface SymbolStatsProps {
  store: SymbolStore
}

function SymbolStats({ store }: SymbolStatsProps): React.JSX.Element {
  const truncateName = (name: string, maxWords: number): string => {
    return name.split(/\s+/).slice(0, maxWords).join(" ")
  }

  const title = store.quote?.name
    ? `${truncateName(store.quote.name, 3)} (${store.symbol})`
    : store.symbol

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        <Text fw={700} size="lg">{title}</Text>

        {store.quote
          ? (
              <>
                <Group justify="space-between">
                  <Stack gap={4}>
                    <Text size="xs" c="dimmed">Price</Text>
                    <Text size="xl" fw={700}>{formatPrice(store.quote.price)}</Text>
                  </Stack>
                  <Stack gap={4}>
                    <Text size="xs" c="dimmed">Change</Text>
                    <Text size="xl" fw={700} c={getChangeColor(store.quote.change)}>
                      {formatChange(store.quote.change)}
                    </Text>
                  </Stack>
                  <Stack gap={4}>
                    <Text size="xs" c="dimmed">Change %</Text>
                    <Text size="xl" fw={700} c={getChangeColor(store.quote.changePercent)}>
                      {formatChangePercent(store.quote.changePercent)}
                    </Text>
                  </Stack>
                </Group>

                <Group justify="space-between">
                  <Stack gap={4}>
                    <Text size="xs" c="dimmed">Balance</Text>
                    <Text size="xl">{formatPrice(store.balance)}</Text>
                  </Stack>
                  <Stack gap={4}>
                    <Text size="xs" c="dimmed">Amount</Text>
                    <Group gap={4}>
                      <NumberInput
                        size="xs"
                        value={store.amount}
                        onChange={value => store.setAmount(Number(value) || 0)}
                        onKeyDown={e => e.key === "Enter" && store.stopEditing()}
                        min={0}
                        step={1}
                        hideControls
                        disabled={!store.editingAmount}
                        styles={{ input: { width: 80 } }}
                      />
                      <ActionIcon
                        variant={store.editingAmount ? "filled" : "subtle"}
                        size="sm"
                        aria-label={store.editingAmount ? "Stop editing" : "Edit amount"}
                        onClick={() => store.editingAmount ? store.stopEditing() : store.startEditing()}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4" />
                          <path d="M13.5 6.5l4 4" />
                        </svg>
                      </ActionIcon>
                    </Group>
                  </Stack>
                </Group>

                <Group grow>
                  <PriceChangeCard
                    label="1 Month"
                    value={store.quote.change1m}
                    formatChangePercent={formatChangePercent}
                    getChangeColor={getChangeColor}
                  />
                  <PriceChangeCard
                    label="6 Months"
                    value={store.quote.change6m}
                    formatChangePercent={formatChangePercent}
                    getChangeColor={getChangeColor}
                  />
                  <PriceChangeCard
                    label="2 Years"
                    value={store.quote.change2y}
                    formatChangePercent={formatChangePercent}
                    getChangeColor={getChangeColor}
                  />
                </Group>
              </>
            )
          : <Text c="dimmed" ta="center">No data</Text>}
      </Stack>
    </Card>
  )
}

interface PriceChangeCardProps {
  label: string
  value: number | null
  formatChangePercent: (value: number) => string
  getChangeColor: (value: number) => string
}

function PriceChangeCard({ label, value, formatChangePercent, getChangeColor }: PriceChangeCardProps): React.JSX.Element {
  return (
    <Paper radius="sm" p="sm" withBorder>
      <Stack gap={4} align="center">
        <Text size="xs" c="dimmed">{label}</Text>
        {value != null
          ? (
              <Text size="lg" fw={700} c={getChangeColor(value)}>
                {formatChangePercent(value)}
              </Text>
            )
          : (
              <Text size="lg" fw={700} c="dimmed">N/A</Text>
            )}
      </Stack>
    </Paper>
  )
}

const SymbolStatsObserver = observer(SymbolStats)
export default SymbolStatsObserver
