import type { PropsWithChildren } from "react"

import { MantineProvider } from "@mantine/core"
import { useStores } from "@renderer/stores/useStores"
import { observer } from "mobx-react-lite"

export const ThemedApp = observer(({ children }: PropsWithChildren): React.JSX.Element => {
  const { theme } = useStores()

  return (
    <MantineProvider forceColorScheme={theme.colorScheme}>
      {children}
    </MantineProvider>
  )
})
