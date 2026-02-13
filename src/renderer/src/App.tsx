import { MantineProvider, Stack, Title } from "@mantine/core"
import GoldStats from "@renderer/components/GoldStats"
import { StoreProvider } from "@renderer/stores/StoreProvider"

function App(): React.JSX.Element {
  return (
    <MantineProvider>
      <StoreProvider>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", padding: "2rem" }}>
          <Stack align="center" gap="xl">
            <Title order={1} size="4rem">Money Hero</Title>
            <GoldStats />
          </Stack>
        </div>
      </StoreProvider>
    </MantineProvider>
  )
}

export default App
