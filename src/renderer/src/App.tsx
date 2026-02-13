import { Stack, Title } from "@mantine/core"
import GoldStats from "@renderer/components/GoldStats"
import StocksTable from "@renderer/components/StocksTable"
import ThemeToggle from "@renderer/components/ThemeToggle"
import { StoreProvider } from "@renderer/stores/StoreProvider"
import { ThemedApp } from "@renderer/ThemedApp"

function App(): React.JSX.Element {
  return (
    <StoreProvider>
      <ThemedApp>
        <div style={{ display: "flex", justifyContent: "center", minHeight: "100vh", padding: "2rem" }}>
          <Stack align="center" gap="xl" w="100%" maw={1200}>
            <Title order={1} size="4rem">Money Hero</Title>
            <ThemeToggle />
            <GoldStats />
            <StocksTable />
          </Stack>
        </div>
      </ThemedApp>
    </StoreProvider>
  )
}

export default App
