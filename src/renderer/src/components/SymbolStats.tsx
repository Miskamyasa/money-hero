import { Alert, Button, Card, Center, Group, Loader, Paper, Stack, Text } from "@mantine/core"

import type { SymbolStore } from "@renderer/stores/SymbolStore"

import { observer } from "mobx-react-lite"

import { useEffect } from "react"

interface SymbolStatsProps {
  store: SymbolStore
}

function SymbolStats({ store }: SymbolStatsProps): React.JSX.Element {
  useEffect(() => {
    store.fetchQuote()
  }, [store])

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
    store.fetchQuote()
  }

  const title = store.quote?.name
    ? `${store.quote.name} (${store.symbol})`
    : store.symbol

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <Text fw={700} size="lg">{title}</Text>
          <Button
            variant="light"
            size="xs"
            onClick={handleRefresh}
            loading={store.loading}
          >
            Refresh
          </Button>
        </Group>

        {store.loading && store.quote === null && (
          <Center>
            <Loader />
          </Center>
        )}

        {store.error && (
          <Alert color="red" title="Error">
            {store.error}
          </Alert>
        )}

        {store.quote && (
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

const SymbolStatsObserver = observer(SymbolStats)
export default SymbolStatsObserver
