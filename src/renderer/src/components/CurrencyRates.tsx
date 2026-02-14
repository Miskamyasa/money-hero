import { Group, Paper, Stack, Text } from "@mantine/core"
import { useStores } from "@renderer/stores/useStores"
import { observer } from "mobx-react-lite"

function CurrencyRates(): React.JSX.Element {
  const { currency } = useStores()

  const formatRate = (value: number): string => {
    return value.toFixed(4)
  }

  const formatChangePercent = (value: number): string => {
    const formatted = value.toFixed(2)
    return value >= 0 ? `+${formatted}%` : `${formatted}%`
  }

  const getChangeColor = (value: number): string => {
    return value >= 0 ? "teal" : "red"
  }

  if (!currency.data) {
    return <></>
  }

  const { dollar, currencies } = currency.data

  return (
    <Group grow>
      <Paper radius="sm" p="sm" withBorder>
        <Group justify="space-between" align="center" wrap="nowrap">
          <Text size="xl" fw={700}>USD</Text>
          <Stack gap={0} align="flex-end">
            <Text size="lg" fw={700}>1.00</Text>
            <Text size="xs" c="dimmed">
              DXY
              {" "}
              {dollar.value.toFixed(2)}
            </Text>
          </Stack>
        </Group>
      </Paper>

      {currencies.map(rate => (
        <Paper key={rate.label} radius="sm" p="sm" withBorder>
          <Group justify="space-between" align="center" wrap="nowrap">
            <Text size="xl" fw={700}>{rate.label}</Text>
            <Stack gap={0} align="flex-end">
              <Text size="lg" fw={700}>{formatRate(rate.rate)}</Text>
              <Text size="xs" fw={600} c={getChangeColor(rate.changePercent)}>
                {formatChangePercent(rate.changePercent)}
              </Text>
            </Stack>
          </Group>
        </Paper>
      ))}
    </Group>
  )
}

const CurrencyRatesObserver = observer(CurrencyRates)
export default CurrencyRatesObserver
