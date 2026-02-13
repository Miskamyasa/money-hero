import type { PropsWithChildren } from "react"

import { getStores, StoresContext } from "./useStores"

export function StoreProvider(props: PropsWithChildren) {
  const stores = getStores()

  return <StoresContext value={stores}>{props.children}</StoresContext>
}
