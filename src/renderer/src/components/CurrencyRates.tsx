import {Group, Paper, Stack, Text} from "@mantine/core"
import {observer} from "mobx-react-lite"

import {useStores} from "@renderer/stores/useStores"

function CurrencyRatesImpl(): React.JSX.Element {
  const {currency} = useStores()

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

  const {dollar, currencies} = currency.data

  return (
    <Group grow>
      <Paper
        withBorder
        p="sm"
        radius="sm">
        <Group
          align="center"
          justify="space-between"
          wrap="nowrap">
          <Text
            fw={700}
            size="xl">USD</Text>
          <Stack
            align="flex-end"
            gap={0}>
            <Text
              fw={700}
              size="lg">1.00</Text>
            <Text
              c="dimmed"
              size="xs">
              DXY
              {" "}
              {dollar.value.toFixed(2)}
            </Text>
          </Stack>
        </Group>
      </Paper>

      {currencies.filter(rate => !rate.hidden).map(rate => (
        <Paper
          key={rate.label}
          withBorder
          p="sm"
          radius="sm">
          <Group
            align="center"
            justify="space-between"
            wrap="nowrap">
            <Text
              fw={700}
              size="xl">{rate.label}</Text>
            <Stack
              align="flex-end"
              gap={0}>
              <Text
                fw={700}
                size="lg">{formatRate(rate.rate)}</Text>
              <Text
                c={getChangeColor(rate.changePercent)}
                fw={600}
                size="xs">
                {formatChangePercent(rate.changePercent)}
              </Text>
            </Stack>
          </Group>
        </Paper>
      ))}
    </Group>
  )
}

export const CurrencyRates = observer(CurrencyRatesImpl)
