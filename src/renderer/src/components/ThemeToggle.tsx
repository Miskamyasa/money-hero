import { ActionIcon, useMantineColorScheme } from "@mantine/core"
import { useStores } from "@renderer/stores/useStores"
import { observer } from "mobx-react-lite"

const ThemeToggle = observer((): React.JSX.Element => {
  const { theme } = useStores()
  const { colorScheme } = useMantineColorScheme()

  return (
    <ActionIcon
      variant="default"
      size="lg"
      aria-label="Toggle color scheme"
      onClick={() => theme.toggleColorScheme()}
    >
      {colorScheme === "dark" ? "\u2600\uFE0F" : "\uD83C\uDF19"}
    </ActionIcon>
  )
})

export default ThemeToggle
