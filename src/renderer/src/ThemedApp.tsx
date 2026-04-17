import type {PropsWithChildren} from "react"

import {createTheme, MantineProvider} from "@mantine/core"
import {Notifications} from "@mantine/notifications"
import {observer} from "mobx-react-lite"

import {useStores} from "@renderer/stores/useStores"

export const ThemedApp = observer(({children}: PropsWithChildren): React.JSX.Element => {
  const {theme} = useStores()

  return (
    <MantineProvider
      forceColorScheme={theme.colorScheme}
      theme={createTheme({
      })}>
      <Notifications position="top-right" />
      {children}
    </MantineProvider>
  )
})
