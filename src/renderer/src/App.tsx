import {useEffect, useState} from "react"

import {ActionIcon, Button, Group, Stack, Text, Title} from "@mantine/core"
import {observer} from "mobx-react-lite"

import {CurrencyRates} from "@renderer/components/CurrencyRates"
import {FetchProgress} from "@renderer/components/FetchProgress"
import {FilterDrawer} from "@renderer/components/FilterDrawer"
import {GoldStats} from "@renderer/components/GoldStats"
import {StocksTable} from "@renderer/components/StocksTable"
import {SymbolStats} from "@renderer/components/SymbolStats"
import {ThemeToggle} from "@renderer/components/ThemeToggle"
import {StoreProvider} from "@renderer/stores/StoreProvider"
import {useStores} from "@renderer/stores/useStores"
import {ThemedApp} from "@renderer/ThemedApp"
import {formatPrice} from "@renderer/utils/quoteFormatters"

const FILTER_ICON_PATH =
  "M4 4h16v2.172a2 2 0 0 1 -.586 1.414l-4.414 4.414v7l-6 2v-8.5l-4.48 -4.928a2 2 0 0 1 -.52 -1.345v-2.227z"

function Dashboard(): React.JSX.Element {
  const stores = useStores()
  const [drawerOpened, setDrawerOpened] = useState(false)

  useEffect(() => {
    // Load persisted data (non-fetch)
    void stores.gold.loadAmount()
    void stores.gold.loadFromCache()
    void stores.vwra.loadAmount()
    void stores.vwra.loadFromCache()
    void stores.voo.loadAmount()
    void stores.voo.loadFromCache()
    void stores.currency.loadFromCache()
    void stores.aristocrats.data.loadFromCache()
    void stores.aristocrats.data.loadAmounts()
    void stores.aristocrats.ui.loadDisabledSymbols()
    void stores.aristocrats.ui.loadCollapseState()
    void stores.highYield.data.loadFromCache()
    void stores.highYield.data.loadAmounts()
    void stores.highYield.ui.loadDisabledSymbols()
    void stores.highYield.ui.loadCollapseState()
    void stores.water.data.loadFromCache()
    void stores.water.data.loadAmounts()
    void stores.water.ui.loadDisabledSymbols()
    void stores.water.ui.loadCollapseState()

    // Fetch startup items through the queue
    stores.fetchStartupItems()

    // Auto-refresh all data every 20 minutes
    stores.startAutoRefresh()
    return () => {
      stores.stopAutoRefresh()
    }
  }, [stores])

  const handleRefreshAll = (): void => {
    stores.refreshAll()
  }

  return (
    <div style={{display: "flex", justifyContent: "center", minHeight: "100vh", minWidth: "100%", padding: "2rem"}}>
      <Stack
        align="stretch"
        gap="xl"
        maw={1200}
        w="100%">
        <Group
          gap="sm"
          justify="space-between">
          <Group
            align="center"
            gap="md">
            <Title
              size="3rem"
              style={{textTransform: "uppercase"}}>Money Hero</Title>
            {stores.balance.totalBalanceIls > 0 && (
              <Text
                c="dimmed"
                size="xl">{formatPrice(stores.balance.totalBalanceIls, "ILS")}</Text>
            )}
          </Group>
          <Group gap="xs">
            <Button
              disabled={stores.fetchQueue.running}
              loading={stores.fetchQueue.running}
              size="sm"
              variant="light"
              onClick={handleRefreshAll}>
              Refresh
            </Button>
            <ActionIcon
              aria-label="Filter stocks"
              size="lg"
              variant="default"
              onClick={() => {
                setDrawerOpened(true)
              }}>
              <svg
                fill="none"
                height="18"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
                width="18"
                xmlns="http://www.w3.org/2000/svg">
                <path d={FILTER_ICON_PATH} />
              </svg>
            </ActionIcon>
            <ThemeToggle />
          </Group>
        </Group>
        <CurrencyRates />
        <Group
          grow
          align="stretch"
          w="100%">
          <GoldStats />
          <SymbolStats store={stores.vwra} />
          <SymbolStats store={stores.voo} />
        </Group>
        <FetchProgress />
        <StocksTable
          store={stores.water}
          title="Water" />
        <StocksTable
          store={stores.highYield}
          title="High Yield" />
        <StocksTable
          store={stores.aristocrats}
          title="Dividend Aristocrats" />
      </Stack>
      <FilterDrawer
        opened={drawerOpened}
        onClose={() => {
          setDrawerOpened(false)
        }} />
    </div>
  )
}

const DashboardObserver = observer(Dashboard)

function App(): React.JSX.Element {
  return (
    <StoreProvider>
      <ThemedApp>
        <DashboardObserver />
      </ThemedApp>
    </StoreProvider>
  )
}

export {App}
