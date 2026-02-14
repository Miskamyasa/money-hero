import type { PropsWithChildren } from "react"

import { createTheme, MantineProvider } from "@mantine/core"
import { Notifications } from "@mantine/notifications"
import { useStores } from "@renderer/stores/useStores"
import { observer } from "mobx-react-lite"

export const ThemedApp = observer(({ children }: PropsWithChildren): React.JSX.Element => {
  const { theme } = useStores()

  return (
    <MantineProvider
      theme={createTheme({
      })}
      forceColorScheme={theme.colorScheme}
    >
      <Notifications position="top-right" />
      {children}
    </MantineProvider>
  )
})
