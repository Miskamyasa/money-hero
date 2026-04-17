import {ActionIcon, useMantineColorScheme} from "@mantine/core"
import {observer} from "mobx-react-lite"

import {useStores} from "@renderer/stores/useStores"

export const ThemeToggle = observer((): React.JSX.Element => {
  const {theme} = useStores()
  const {colorScheme} = useMantineColorScheme()

  return (
    <ActionIcon
      aria-label="Toggle color scheme"
      size="lg"
      variant="default"
      onClick={() => {
        theme.toggleColorScheme()
      }}>
      {colorScheme === "dark" ? "\u2600\uFE0F" : "\uD83C\uDF19"}
    </ActionIcon>
  )
})
