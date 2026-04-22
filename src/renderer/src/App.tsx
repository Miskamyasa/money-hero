import {useEffect, useState} from "react"

import {ActionIcon, Button, Group, Stack, Text, Title} from "@mantine/core"
import {observer} from "mobx-react-lite"

import moneyHeroLogo from "@renderer/assets/money-hero-logo.png"
import {CurrencyRates} from "@renderer/components/CurrencyRates"
import {ExpectedBalanceWidget} from "@renderer/components/ExpectedBalanceWidget"
import {FetchProgress} from "@renderer/components/FetchProgress"
import {FilterDrawer} from "@renderer/components/FilterDrawer"
import {GoldStats} from "@renderer/components/GoldStats"
import {Sp500Stats} from "@renderer/components/Sp500Stats"
import {StocksTable} from "@renderer/components/StocksTable"
import {Ta35Stats} from "@renderer/components/Ta35Stats"
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
    void stores.currency.loadFromCache()
    void stores.stockTargetWeights.loadWeights()
    void stores.psagotEtfs.data.loadFromCache()
    void stores.psagotEtfs.data.loadAmounts()
    void stores.psagotEtfs.ui.loadDisabledSymbols()
    void stores.psagotEtfs.ui.loadCollapseState()
    void stores.fundsEtfs.data.loadFromCache()
    void stores.fundsEtfs.data.loadAmounts()
    void stores.fundsEtfs.ui.loadDisabledSymbols()
    void stores.fundsEtfs.ui.loadCollapseState()
    void stores.individualStocks.data.loadFromCache()
    void stores.individualStocks.data.loadAmounts()
    void stores.individualStocks.ui.loadDisabledSymbols()
    void stores.individualStocks.ui.loadCollapseState()
    // void stores.aristocrats.data.loadFromCache()
    // void stores.aristocrats.data.loadAmounts()
    // void stores.aristocrats.ui.loadDisabledSymbols()
    // void stores.aristocrats.ui.loadCollapseState()
    // void stores.highYield.data.loadFromCache()
    // void stores.highYield.data.loadAmounts()
    // void stores.highYield.ui.loadDisabledSymbols()
    // void stores.highYield.ui.loadCollapseState()
    // void stores.water.data.loadFromCache()
    // void stores.water.data.loadAmounts()
    // void stores.water.ui.loadDisabledSymbols()
    // void stores.water.ui.loadCollapseState()
    // void stores.vwra.loadAmount()
    // void stores.vwra.loadFromCache()
    // void stores.igln.loadAmount()
    // void stores.igln.loadFromCache()
    // void stores.tase.loadAmount()
    // void stores.tase.loadFromCache()
    // void stores.copx.loadAmount()
    // void stores.copx.loadFromCache()
    // void stores.psi.loadAmount()
    // void stores.psi.loadFromCache()
    // void stores.healL.loadAmount()
    // void stores.healL.loadFromCache()

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
            <img
              alt="Money Hero logo"
              src={moneyHeroLogo}
              style={{display: "block", flexShrink: 0, height: 64, width: "auto"}} />
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
          <Sp500Stats />
          <Ta35Stats />
        </Group>
        <Group
          grow
          align="stretch"
          w="100%">
          <ExpectedBalanceWidget
            changePercent={stores.expectedBalance.expectedBalance1yChangePercent}
            title="Expected Balance in 1 Year"
            value={stores.expectedBalance.expectedBalance1yIls} />
          <ExpectedBalanceWidget
            changePercent={stores.expectedBalance.expectedBalance5yChangePercent}
            title="Expected Balance in 5 Years"
            value={stores.expectedBalance.expectedBalance5yIls} />
        </Group>
        {/*<Group*/}
        {/*  grow*/}
        {/*  align="stretch"*/}
        {/*  w="100%">*/}
        {/*  <SymbolStats store={stores.igln} />*/}
        {/*  <SymbolStats store={stores.vwra} />*/}
        {/*  <SymbolStats store={stores.tase} />*/}
        {/*</Group>*/}
        {/*<Group*/}
        {/*  grow*/}
        {/*  align="stretch"*/}
        {/*  w="100%">*/}
        {/*  <SymbolStats store={stores.copx} />*/}
        {/*  <SymbolStats store={stores.psi} />*/}
        {/*  <SymbolStats store={stores.healL} />*/}
        {/*</Group>*/}
        <FetchProgress />
        <StocksTable
          store={stores.individualStocks}
          title="IBI: Individual Stocks" />
        <StocksTable
          store={stores.fundsEtfs}
          title="IBI: Funds / ETFs" />
        <StocksTable
          store={stores.psagotEtfs}
          title="Psagot: Funds / ETFs" />
        {/*<StocksTable*/}
        {/*  store={stores.water}*/}
        {/*  title="Water" />*/}
        {/*<StocksTable*/}
        {/*  store={stores.highYield}*/}
        {/*  title="High Yield" />*/}
        {/*<StocksTable*/}
        {/*  store={stores.aristocrats}*/}
        {/*  title="Dividend Aristocrats" />*/}
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
