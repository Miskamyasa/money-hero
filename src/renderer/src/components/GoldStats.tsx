import { Alert, Button, Card, Center, Group, Loader, Paper, Stack, Text } from "@mantine/core"

import { useStores } from "@renderer/stores/useStores"
import { observer } from "mobx-react-lite"

import { useEffect } from "react"

function GoldStats(): React.JSX.Element {
  const { gold } = useStores()

  useEffect(() => {
    gold.fetchQuote()
    gold.fetchHistory()
  }, [gold])

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
    gold.fetchQuote()
    gold.fetchHistory()
  }

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <Text fw={700} size="lg">Gold (GC=F)</Text>
          <Button
            variant="light"
            size="xs"
            onClick={handleRefresh}
            loading={gold.loading}
          >
            Refresh
          </Button>
        </Group>

        {gold.loading && gold.quote === null && (
          <Center>
            <Loader />
          </Center>
        )}

        {gold.error && (
          <Alert color="red" title="Error">
            {gold.error}
          </Alert>
        )}

        {gold.quote && (
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
        )}

        {gold.historyLoading && gold.history === null && (
          <Center>
            <Loader size="sm" />
          </Center>
        )}

        {gold.historyError && (
          <Alert color="red" title="History Error" variant="light">
            {gold.historyError}
          </Alert>
        )}

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
