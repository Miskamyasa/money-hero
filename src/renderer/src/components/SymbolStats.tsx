import {ActionIcon, Card, Group, NumberInput, Paper, Stack, Text} from "@mantine/core"
import {observer} from "mobx-react-lite"

import type {SymbolStore} from "@renderer/stores/SymbolStore"
import {useStores} from "@renderer/stores/useStores"
import {formatChangePercent, formatPrice, formatShareBracket, getChangeColor} from "@renderer/utils/quoteFormatters"

type SymbolStatsProps = {
  store: SymbolStore,
}

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

function SymbolStatsImpl({store}: SymbolStatsProps): React.JSX.Element {
  const {currency, balance} = useStores()
  const truncateName = (name: string, maxWords: number): string => {
    return name.split(/\s+/).slice(0, maxWords).join(" ")
  }

  const balanceIls = store.quote
    ? currency.convertToIls(store.balance, store.quote.currency)
    : null
  const shareText = store.amount > 0 && balanceIls != null
    ? formatShareBracket(balance.shareOfTotal(balanceIls))
    : ""

  const title = store.quote?.name
    ? `${truncateName(store.quote.name, 3)} (${store.symbol})`
    : store.symbol

  return (
    <Card
      withBorder
      padding="lg"
      radius="md"
      shadow="sm">
      <Stack gap="md">
        <Text
          fw={700}
          size="lg">{title}</Text>

        {store.quote
          ? (
            <>
              <Stack gap={4}>
                <Text
                  c="dimmed"
                  size="xs">Price</Text>
                <Text
                  fw={700}
                  size="xl">{formatPrice(store.quote.price, store.quote.currency)}</Text>
              </Stack>

              <Group justify="space-between">
                <Stack gap={4}>
                  <Text
                    c="dimmed"
                    size="xs">Balance</Text>
                  <Group
                    gap={6}
                    wrap="nowrap">
                    <Text size="xl">{formatPrice(store.balance, store.quote.currency)}</Text>
                    {shareText && (
                      <Text
                        c="dimmed"
                        size="xl">{shareText}</Text>
                    )}
                  </Group>
                </Stack>
                <Stack gap={4}>
                  <Text
                    c="dimmed"
                    size="xs">Amount</Text>
                  <Group gap={4}>
                    <NumberInput
                      hideControls
                      disabled={!store.editingAmount}
                      min={0}
                      size="xs"
                      step={1}
                      styles={{
                        input: {
                          width: 80,
                          fontSize: 14,
                          ...(store.amount !== 0 && !store.editingAmount && {
                            color: "var(--mantine-color-blue-filled)",
                            fontWeight: 700,
                            opacity: 1,
                          }),
                        },
                      }}
                      value={store.amount}
                      onChange={value => {
                        store.setAmount(Number(value) || 0)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") store.stopEditing()
                      }}/>
                    <ActionIcon
                      aria-label={store.editingAmount ? "Stop editing" : "Edit amount"}
                      size="sm"
                      variant={store.editingAmount ? "filled" : "subtle"}
                      onClick={() => {
                        if (store.editingAmount) {
                          store.stopEditing()
                        }
                        else {
                          store.startEditing()
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

              <Group grow>
                <PriceChangeCard
                  formatChangePercent={formatChangePercent}
                  getChangeColor={getChangeColor}
                  label="1 Month"
                  value={store.quote.change1m}/>
                <PriceChangeCard
                  formatChangePercent={formatChangePercent}
                  getChangeColor={getChangeColor}
                  label="6 Months"
                  value={store.quote.change6m}/>
                <PriceChangeCard
                  formatChangePercent={formatChangePercent}
                  getChangeColor={getChangeColor}
                  label="2 Years"
                  value={store.quote.change2y}/>
              </Group>
            </>
          )
          : (
            <Text
              c="dimmed"
              ta="center">No data</Text>
          )}
      </Stack>
    </Card>
  )
}

export const SymbolStats = observer(SymbolStatsImpl)
