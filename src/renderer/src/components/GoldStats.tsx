import { Alert, Button, Card, Center, Group, Loader, Stack, Text } from "@mantine/core"

import { useStores } from "@renderer/stores/useStores"
import { observer } from "mobx-react-lite"

import { useEffect } from "react"

function GoldStats(): React.JSX.Element {
  const { gold } = useStores()

  useEffect(() => {
    gold.fetchQuote()
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

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <Text fw={700} size="lg">Gold (GC=F)</Text>
          <Button
            variant="light"
            size="xs"
            onClick={() => gold.fetchQuote()}
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
      </Stack>
    </Card>
  )
}

const GoldStatsObserver = observer(GoldStats)
export default GoldStatsObserver
