import {ActionIcon, Card, Group, NumberInput, Paper, Stack, Text} from "@mantine/core"
import {observer} from "mobx-react-lite"

import {useStores} from "@renderer/stores/useStores"
import {formatChangePercent, formatPrice, getChangeColor} from "@renderer/utils/quoteFormatters"

type PriceChangeCardProps = {
  label: string,
  value: number | null,
  formatChangePercent: (value: number) => string,
  getChangeColor: (value: number) => string,
}

function PriceChangeCard({label, value, formatChangePercent, getChangeColor}: PriceChangeCardProps): React.JSX.Element {
  return (
    <Paper
      withBorder
      p="sm"
      radius="sm">
      <Stack
        align="center"
        gap={4}>
        <Text
          c="dimmed"
          size="xs">{label}</Text>
        {value != null
          ? (
            <Text
              c={getChangeColor(value)}
              fw={700}
              size="lg">
              {formatChangePercent(value)}
            </Text>
          )
          : (
            <Text
              c="dimmed"
              fw={700}
              size="lg">N/A</Text>
          )}
      </Stack>
    </Paper>
  )
}

function GoldStatsImpl(): React.JSX.Element {
  const {gold} = useStores()

  return (
    <Card
      withBorder
      padding="lg"
      radius="md"
      shadow="sm">
      <Stack gap="md">
        <Text
          fw={700}
          size="lg">Gold (GC=F)</Text>

        {gold.quote
          ? (
            <>
              <Stack gap={4}>
                <Text
                  c="dimmed"
                  size="xs">Price</Text>
                <Text
                  fw={700}
                  size="xl">{formatPrice(gold.quote.price, gold.quote.currency)}</Text>
              </Stack>

              <Group justify="space-between">
                <Stack gap={4}>
                  <Text
                    c="dimmed"
                    size="xs">Balance</Text>
                  <Text size="xl">{formatPrice(gold.balance, gold.quote.currency)}</Text>
                </Stack>
                <Stack gap={4}>
                  <Text
                    c="dimmed"
                    size="xs">Amount</Text>
                  <Group gap={4}>
                    <NumberInput
                      hideControls
                      disabled={!gold.editingAmount}
                      min={0}
                      size="xs"
                      step={1}
                      styles={{input: {width: 80}}}
                      value={gold.amount}
                      onChange={value => {
                        gold.setAmount(Number(value) || 0)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") gold.stopEditing()
                      }}/>
                    <ActionIcon
                      aria-label={gold.editingAmount ? "Stop editing" : "Edit amount"}
                      size="sm"
                      variant={gold.editingAmount ? "filled" : "subtle"}
                      onClick={() => {
                        if (gold.editingAmount) {
                          gold.stopEditing()
                        }
                        else {
                          gold.startEditing()
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
                  </Group>
                </Stack>
              </Group>
            </>
          )
          : (
            <Text
              c="dimmed"
              ta="center">No data</Text>
          )}

        {gold.history && (
          <Group grow>
            <PriceChangeCard
              formatChangePercent={formatChangePercent}
              getChangeColor={getChangeColor}
              label="1 Month"
              value={gold.history.change1m}/>
            <PriceChangeCard
              formatChangePercent={formatChangePercent}
              getChangeColor={getChangeColor}
              label="6 Months"
              value={gold.history.change6m}/>
            <PriceChangeCard
              formatChangePercent={formatChangePercent}
              getChangeColor={getChangeColor}
              label="2 Years"
              value={gold.history.change2y}/>
          </Group>
        )}
      </Stack>
    </Card>
  )
}

export const GoldStats = observer(GoldStatsImpl)
