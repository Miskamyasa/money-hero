import {Paper, Progress, Stack, Text} from "@mantine/core"
import {observer} from "mobx-react-lite"

import {useStores} from "@renderer/stores/useStores"

function FetchProgressImpl(): React.JSX.Element {
  const {fetchQueue} = useStores()

  if (!fetchQueue.running) {
    return <></>
  }

  return (
    <Paper
      withBorder
      p="sm"
      radius="sm">
      <Stack gap={4}>
        <Progress
          size="sm"
          value={fetchQueue.progress * 100} />
        <Text
          c="dimmed"
          size="xs">
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

export const FetchProgress = observer(FetchProgressImpl)
