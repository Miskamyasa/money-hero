import { Button, Drawer, Group, Stack, Text } from "@mantine/core"
import { useStores } from "@renderer/stores/useStores"
import { observer } from "mobx-react-lite"

interface FilterDrawerProps {
  opened: boolean
  onClose: () => void
}

function FilterDrawer({ opened, onClose }: FilterDrawerProps): React.JSX.Element {
  const { stocks, highYield, water } = useStores()
  const stocksUi = stocks.ui
  const highYieldUi = highYield.ui
  const waterUi = water.ui

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="left"
      title="Filter Stocks"
      size="md"
      styles={{ inner: { inset: 0 } }}
    >
      <Stack gap="xl">
        <div>
          <Text fw={500} mb="xs">Dividend Aristocrats</Text>
          <Group gap="xs">
            {stocks.allSymbols.map(symbol => (
              <Button
                key={symbol}
                size="compact-xs"
                variant={stocksUi.isSymbolEnabled(symbol) ? "filled" : "default"}
                onClick={() => stocksUi.toggleSymbol(symbol)}
              >
                {symbol}
              </Button>
            ))}
          </Group>
        </div>

        <div>
          <Text fw={500} mb="xs">High Yield</Text>
          <Group gap="xs">
            {highYield.allSymbols.map(symbol => (
              <Button
                key={symbol}
                size="compact-xs"
                variant={highYieldUi.isSymbolEnabled(symbol) ? "filled" : "default"}
                onClick={() => highYieldUi.toggleSymbol(symbol)}
              >
                {symbol}
              </Button>
            ))}
          </Group>
        </div>

        <div>
          <Text fw={500} mb="xs">Water</Text>
          <Group gap="xs">
            {water.allSymbols.map(symbol => (
              <Button
                key={symbol}
                size="compact-xs"
                variant={waterUi.isSymbolEnabled(symbol) ? "filled" : "default"}
                onClick={() => waterUi.toggleSymbol(symbol)}
              >
                {symbol}
              </Button>
            ))}
          </Group>
        </div>
      </Stack>
    </Drawer>
  )
}

const FilterDrawerObserver = observer(FilterDrawer)
export default FilterDrawerObserver
