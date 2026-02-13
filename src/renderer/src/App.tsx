import { Group, Stack, Title } from "@mantine/core"
import CurrencyRates from "@renderer/components/CurrencyRates"
import GoldStats from "@renderer/components/GoldStats"
import StocksTable from "@renderer/components/StocksTable"
import SymbolStats from "@renderer/components/SymbolStats"
import ThemeToggle from "@renderer/components/ThemeToggle"
import { StoreProvider } from "@renderer/stores/StoreProvider"
import { useStores } from "@renderer/stores/useStores"
import { ThemedApp } from "@renderer/ThemedApp"

function Dashboard(): React.JSX.Element {
  const { vt, voo } = useStores()

  return (
    <div style={{ display: "flex", justifyContent: "center", minHeight: "100vh", padding: "2rem" }}>
      <Stack align="stretch" gap="xl" w="100%" maw={1200}>
        <Title order={1} size="4rem" ta="center">Money Hero</Title>
        <ThemeToggle />
        <CurrencyRates />
        <Group grow align="stretch" w="100%">
          <GoldStats />
          <SymbolStats store={vt} />
          <SymbolStats store={voo} />
        </Group>
        <StocksTable />
      </Stack>
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
