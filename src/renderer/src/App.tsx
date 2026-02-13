import { MantineProvider, Title } from "@mantine/core"
import { StoreProvider } from "@renderer/stores/StoreProvider"

function App(): React.JSX.Element {
  return (
    <MantineProvider>
      <StoreProvider>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
          <Title order={1} size="4rem">Money Hero</Title>
        </div>
      </StoreProvider>
    </MantineProvider>
  )
}

export default App
