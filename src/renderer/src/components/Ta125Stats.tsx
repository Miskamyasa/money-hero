import {useEffect} from "react"

import {observer} from "mobx-react-lite"

import {InfoWidget} from "@renderer/components/InfoWidget"
import {TA125_WIDGET_TITLE} from "@renderer/config/statsWidgets"
import {useStores} from "@renderer/stores/useStores"

function Ta125StatsImpl(): React.JSX.Element {
  const {ta125} = useStores()
  const quote = ta125.quote

  useEffect(() => {
    void ta125.loadFromCache()
  }, [ta125])

  return (
    <InfoWidget
      changes={{
        change1m: quote?.change1m ?? null,
        change6m: quote?.change6m ?? null,
        change2y: quote?.change2y ?? null,
      }}
      currency={quote?.currency ?? "USD"}
      hasData={quote != null}
      price={quote?.price ?? 0}
      title={TA125_WIDGET_TITLE} />
  )
}

export const Ta125Stats = observer(Ta125StatsImpl)
