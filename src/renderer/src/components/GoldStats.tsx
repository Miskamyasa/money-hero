import { ActionIcon, Card, Group, NumberInput, Paper, Stack, Text } from "@mantine/core"

import { useStores } from "@renderer/stores/useStores"
import { formatChange, formatChangePercent, formatPrice, getChangeColor } from "@renderer/utils/quoteFormatters"
import { observer } from "mobx-react-lite"

function GoldStats(): React.JSX.Element {
  const { gold } = useStores()

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        <Text fw={700} size="lg">Gold (GC=F)</Text>

        {gold.quote
          ? (
              <>
                <Group justify="space-between">
                  <Stack gap={4}>
                    <Text size="xs" c="dimmed">Price</Text>
                    <Text size="xl" fw={700}>{formatPrice(gold.quote.price)}</Text>
                  </Stack>
                  <Stack gap={4}>
                    <Text size="xs" c="dimmed">Change</Text>
                    <Text size="xl" fw={700} c={getChangeColor(gold.quote.change)}>
                      {formatChange(gold.quote.change)}
                    </Text>
                  </Stack>
                  <Stack gap={4}>
                    <Text size="xs" c="dimmed">Change %</Text>
                    <Text size="xl" fw={700} c={getChangeColor(gold.quote.changePercent)}>
                      {formatChangePercent(gold.quote.changePercent)}
                    </Text>
                  </Stack>
                </Group>

                <Group justify="space-between">
                  <Stack gap={4}>
                    <Text size="xs" c="dimmed">Balance</Text>
                    <Text size="xl" fw={700}>{formatPrice(gold.balance)}</Text>
                  </Stack>
                  <Stack gap={4}>
                    <Text size="xs" c="dimmed">Amount</Text>
                    <Group gap={4}>
                      <NumberInput
                        size="xs"
                        value={gold.amount}
                        onChange={value => gold.setAmount(Number(value) || 0)}
                        min={0}
                        step={1}
                        hideControls
                        disabled={!gold.editingAmount}
                        styles={{ input: { width: 80 } }}
                      />
                      <ActionIcon
                        variant={gold.editingAmount ? "filled" : "subtle"}
                        size="sm"
                        aria-label={gold.editingAmount ? "Stop editing" : "Edit amount"}
                        onClick={() => gold.editingAmount ? gold.stopEditing() : gold.startEditing()}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4" />
                          <path d="M13.5 6.5l4 4" />
                        </svg>
                      </ActionIcon>
                    </Group>
                  </Stack>
                </Group>
              </>
            )
          : <Text c="dimmed" ta="center">No data</Text>}

        {gold.history && (
          <Group grow>
            <PriceChangeCard
              label="1 Month"
              value={gold.history.change1m}
              formatChangePercent={formatChangePercent}
              getChangeColor={getChangeColor}
            />
            <PriceChangeCard
              label="6 Months"
              value={gold.history.change6m}
              formatChangePercent={formatChangePercent}
              getChangeColor={getChangeColor}
            />
            <PriceChangeCard
              label="2 Years"
              value={gold.history.change2y}
              formatChangePercent={formatChangePercent}
              getChangeColor={getChangeColor}
            />
          </Group>
        )}
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

const GoldStatsObserver = observer(GoldStats)
export default GoldStatsObserver
