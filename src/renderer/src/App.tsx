import { ActionIcon, Button, Group, Stack, Title } from "@mantine/core"
import CurrencyRates from "@renderer/components/CurrencyRates"
import FetchProgress from "@renderer/components/FetchProgress"
import FilterDrawer from "@renderer/components/FilterDrawer"
import GoldStats from "@renderer/components/GoldStats"
import StocksTable from "@renderer/components/StocksTable"
import SymbolStats from "@renderer/components/SymbolStats"
import ThemeToggle from "@renderer/components/ThemeToggle"
import { StoreProvider } from "@renderer/stores/StoreProvider"
import { useStores } from "@renderer/stores/useStores"
import { ThemedApp } from "@renderer/ThemedApp"
import { useEffect, useState } from "react"

function Dashboard(): React.JSX.Element {
  const root = useStores()
  const { vt, voo, stocks, highYield, water, gold, fetchQueue } = root
  const [drawerOpened, setDrawerOpened] = useState(false)

  useEffect(() => {
    // Load persisted data (non-fetch)
    void gold.loadAmount()
    void vt.loadAmount()
    void voo.loadAmount()
    void stocks.data.loadFromCache()
    void stocks.data.loadAmounts()
    void stocks.ui.loadDisabledSymbols()
    void highYield.data.loadFromCache()
    void highYield.data.loadAmounts()
    void highYield.ui.loadDisabledSymbols()
    void water.data.loadFromCache()
    void water.data.loadAmounts()
    void water.ui.loadDisabledSymbols()

    // Fetch startup items through the queue
    root.fetchStartupItems()
  }, [root, gold, vt, voo, stocks, highYield, water])

  const handleRefreshAll = (): void => {
    root.refreshAll()
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", minHeight: "100vh", minWidth: "100%", padding: "2rem" }}>
      <Stack align="stretch" gap="xl" w="100%" maw={1200}>
        <Group justify="space-between" gap="sm">
          <Title size="3rem" style={{ textTransform: "uppercase" }}>Money Hero</Title>
          <Button
            disabled={fetchQueue.running}
            variant="light"
            size="xs"
            onClick={handleRefreshAll}
            loading={fetchQueue.running}
          >
            Refresh
          </Button>
        </Group>
        <ActionIcon
          variant="default"
          size="lg"
          aria-label="Filter stocks"
          onClick={() => setDrawerOpened(true)}
          style={{ position: "fixed", top: 16, left: 16 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16v2.172a2 2 0 0 1 -.586 1.414l-4.414 4.414v7l-6 2v-8.5l-4.48 -4.928a2 2 0 0 1 -.52 -1.345v-2.227z" />
          </svg>
        </ActionIcon>
        <ThemeToggle />
        <CurrencyRates />
        <Group grow align="stretch" w="100%">
          <GoldStats />
          <SymbolStats store={vt} />
          <SymbolStats store={voo} />
        </Group>
        <FetchProgress />
        <StocksTable store={water} title="Water" />
        <StocksTable store={highYield} title="High Yield" />
        <StocksTable store={stocks} title="Dividend Aristocrats" />
      </Stack>
      <FilterDrawer opened={drawerOpened} onClose={() => setDrawerOpened(false)} />
    </div>
  )
}

function App(): React.JSX.Element {
  return (
    <StoreProvider>
      <ThemedApp>
        <Dashboard />
      </ThemedApp>
    </StoreProvider>
  )
}

export default App
