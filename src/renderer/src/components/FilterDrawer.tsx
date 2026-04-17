import {Button, Drawer, Group, Stack, Text} from "@mantine/core"
import {observer} from "mobx-react-lite"

import {useStores} from "@renderer/stores/useStores"

type FilterDrawerProps = {
  opened: boolean,
  onClose: () => void,
}

function FilterDrawerImpl({opened, onClose}: FilterDrawerProps): React.JSX.Element {
  const {aristocrats, highYield, water} = useStores()
  const aristocratsUi = aristocrats.ui
  const highYieldUi = highYield.ui
  const waterUi = water.ui

  return (
    <Drawer
      opened={opened}
      position="left"
      size="md"
      styles={{inner: {inset: 0}}}
      title="Filter Stocks"
      onClose={onClose}>
      <Stack gap="xl">

        <div>
          <Text
            fw={500}
            mb="xs">Water</Text>
          <Group gap="xs">
            {water.allSymbols.map(symbol => (
              <Button
                key={symbol}
                size="compact-xs"
                variant={waterUi.isSymbolEnabled(symbol) ? "filled" : "default"}
                onClick={() => {
                  waterUi.toggleSymbol(symbol)
                }}>
                {symbol}
              </Button>
            ))}
          </Group>
        </div>

        <div>
          <Text
            fw={500}
            mb="xs">High Yield</Text>
          <Group gap="xs">
            {highYield.allSymbols.map(symbol => (
              <Button
                key={symbol}
                size="compact-xs"
                variant={highYieldUi.isSymbolEnabled(symbol) ? "filled" : "default"}
                onClick={() => {
                  highYieldUi.toggleSymbol(symbol)
                }}>
                {symbol}
              </Button>
            ))}
          </Group>
        </div>

        <div>
          <Text
            fw={500}
            mb="xs">Dividend Aristocrats</Text>
          <Group gap="xs">
            {aristocrats.allSymbols.map(symbol => (
              <Button
                key={symbol}
                size="compact-xs"
                variant={aristocratsUi.isSymbolEnabled(symbol) ? "filled" : "default"}
                onClick={() => {
                  aristocratsUi.toggleSymbol(symbol)
                }}>
                {symbol}
              </Button>
            ))}
          </Group>
        </div>

      </Stack>
    </Drawer>
  )
}

export const FilterDrawer = observer(FilterDrawerImpl)
