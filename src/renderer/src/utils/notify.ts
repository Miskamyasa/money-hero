import {notifications} from "@mantine/notifications"

export function notifyError(title: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  console.error(title, error)
  notifications.show({
    title,
    message,
    color: "red",
    autoClose: 5000,
  })
}
