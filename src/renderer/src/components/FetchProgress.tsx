import { Paper, Progress, Stack, Text } from "@mantine/core"
import { useStores } from "@renderer/stores/useStores"

import { observer } from "mobx-react-lite"

function FetchProgress(): React.JSX.Element {
  const { fetchQueue } = useStores()

  if (!fetchQueue.running) {
    return <></>
  }

  return (
    <Paper radius="sm" p="sm" withBorder>
      <Stack gap={4}>
        <Progress value={fetchQueue.progress * 100} size="sm" />
        <Text size="xs" c="dimmed">
          Fetching:
          {" "}
          {fetchQueue.currentLabel}
          {" "}
          (
          {fetchQueue.completedCount}
          /
          {fetchQueue.totalCount}
          )
        </Text>
      </Stack>
    </Paper>
  )
}

const FetchProgressObserver = observer(FetchProgress)
export default FetchProgressObserver
