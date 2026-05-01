import {Button, Divider, Drawer, Group, Modal, Stack, Text, useModalsStack} from "@mantine/core"
import {observer} from "mobx-react-lite"

import {useStores} from "@renderer/stores/useStores"

type FilterDrawerProps = {
  opened: boolean,
  onClose: () => void,
}

function FilterDrawerImpl({opened, onClose}: FilterDrawerProps): React.JSX.Element {
  const root = useStores()
  const {
    psagotEtfs,
    fundsEtfs,
    stocksAi,
    stocksHc,
    // aristocrats,
    // highYield,
    // water,
  } = root
  const modalsStack = useModalsStack(["reset-confirm"])

  const handleResetConfirm = (): void => {
    root.resetAllBalances()
    modalsStack.close("reset-confirm")
    onClose()
  }
  // const aristocratsUi = aristocrats.ui
  // const highYieldUi = highYield.ui
  // const waterUi = water.ui
  const fundsEtfsUi = fundsEtfs.ui
  const stocksAiUi = stocksAi.ui
  const stocksHcUi = stocksHc.ui
  const psagotEtfsUi = psagotEtfs.ui

  return (
    <>
      <Drawer
        opened={opened}
        position="left"
        size="md"
        styles={{
          inner: {inset: 0},
          body: {display: "flex", flexDirection: "column", height: "calc(100% - 60px)", paddingBottom: 0},
        }}
        title="Filter Stocks"
        onClose={onClose}>
        <Stack
          gap="xl"
          style={{flex: 1, overflowY: "auto", paddingBottom: "var(--mantine-spacing-md)"}}>
          <div>
            <Text
              fw={500}
              mb="xs">IBI: Ai</Text>
            <Group gap="xs">
              {stocksAi.allSymbols.map(symbol => (
                <Button
                  key={symbol}
                  size="compact-xs"
                  variant={stocksAiUi.isSymbolEnabled(symbol) ? "filled" : "default"}
                  onClick={() => {
                    stocksAiUi.toggleSymbol(symbol)
                  }}>
                  {symbol}
                </Button>
              ))}
            </Group>
          </div>

          <div>
            <Text
              fw={500}
              mb="xs">IBI: Health</Text>
            <Group gap="xs">
              {stocksHc.allSymbols.map(symbol => (
                <Button
                  key={symbol}
                  size="compact-xs"
                  variant={stocksHcUi.isSymbolEnabled(symbol) ? "filled" : "default"}
                  onClick={() => {
                    stocksHcUi.toggleSymbol(symbol)
                  }}>
                  {symbol}
                </Button>
              ))}
            </Group>
          </div>

          <div>
            <Text
              fw={500}
              mb="xs">IBI: Funds / ETFs</Text>
            <Group gap="xs">
              {fundsEtfs.allSymbols.map(symbol => (
                <Button
                  key={symbol}
                  size="compact-xs"
                  variant={fundsEtfsUi.isSymbolEnabled(symbol) ? "filled" : "default"}
                  onClick={() => {
                    fundsEtfsUi.toggleSymbol(symbol)
                  }}>
                  {symbol}
                </Button>
              ))}
            </Group>
          </div>

          <div>
            <Text
              fw={500}
              mb="xs">Psagot: Funds / ETFs</Text>
            <Group gap="xs">
              {psagotEtfs.allSymbols.map(symbol => (
                <Button
                  key={symbol}
                  size="compact-xs"
                  variant={psagotEtfsUi.isSymbolEnabled(symbol) ? "filled" : "default"}
                  onClick={() => {
                    psagotEtfsUi.toggleSymbol(symbol)
                  }}>
                  {symbol}
                </Button>
              ))}
            </Group>
          </div>

          {/*<div>*/}
          {/*  <Text*/}
          {/*    fw={500}*/}
          {/*    mb="xs">Water</Text>*/}
          {/*  <Group gap="xs">*/}
          {/*    {water.allSymbols.map(symbol => (*/}
          {/*      <Button*/}
          {/*        key={symbol}*/}
          {/*        size="compact-xs"*/}
          {/*        variant={waterUi.isSymbolEnabled(symbol) ? "filled" : "default"}*/}
          {/*        onClick={() => {*/}
          {/*          waterUi.toggleSymbol(symbol)*/}
          {/*        }}>*/}
          {/*        {symbol}*/}
          {/*      </Button>*/}
          {/*    ))}*/}
          {/*  </Group>*/}
          {/*</div>*/}

          {/*<div>*/}
          {/*  <Text*/}
          {/*    fw={500}*/}
          {/*    mb="xs">High Yield</Text>*/}
          {/*  <Group gap="xs">*/}
          {/*    {highYield.allSymbols.map(symbol => (*/}
          {/*      <Button*/}
          {/*        key={symbol}*/}
          {/*        size="compact-xs"*/}
          {/*        variant={highYieldUi.isSymbolEnabled(symbol) ? "filled" : "default"}*/}
          {/*        onClick={() => {*/}
          {/*          highYieldUi.toggleSymbol(symbol)*/}
          {/*        }}>*/}
          {/*        {symbol}*/}
          {/*      </Button>*/}
          {/*    ))}*/}
          {/*  </Group>*/}
          {/*</div>*/}

          {/*<div>*/}
          {/*  <Text*/}
          {/*    fw={500}*/}
          {/*    mb="xs">Dividend Aristocrats</Text>*/}
          {/*  <Group gap="xs">*/}
          {/*    {aristocrats.allSymbols.map(symbol => (*/}
          {/*      <Button*/}
          {/*        key={symbol}*/}
          {/*        size="compact-xs"*/}
          {/*        variant={aristocratsUi.isSymbolEnabled(symbol) ? "filled" : "default"}*/}
          {/*        onClick={() => {*/}
          {/*          aristocratsUi.toggleSymbol(symbol)*/}
          {/*        }}>*/}
          {/*        {symbol}*/}
          {/*      </Button>*/}
          {/*    ))}*/}
          {/*  </Group>*/}
          {/*</div>*/}

        </Stack>

        <Divider />
        <Stack
          gap="xs"
          py="md">
          <Button
            color="red"
            variant="light"
            onClick={() => {
              modalsStack.open("reset-confirm")
            }}>
            Reset all balances
          </Button>
        </Stack>
      </Drawer>

      <Modal.Stack>
        <Modal
          {...modalsStack.register("reset-confirm")}
          centered
          styles={{inner: {inset: 0}}}
          title="Reset all balances"
          zIndex={500}>
          <Stack gap="md">
            <Text size="sm">
              This will set every stock amount to 0. This action cannot be undone.
            </Text>
            <Group justify="flex-end">
              <Button
                variant="default"
                onClick={() => {
                  modalsStack.close("reset-confirm")
                }}>
                Cancel
              </Button>
              <Button
                color="red"
                onClick={handleResetConfirm}>
                Reset
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Modal.Stack>
    </>
  )
}

export const FilterDrawer = observer(FilterDrawerImpl)
