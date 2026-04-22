import {useEffect} from "react"

import {observer} from "mobx-react-lite"

import {InfoWidget} from "@renderer/components/InfoWidget"
import {SP500_WIDGET_TITLE} from "@renderer/config/statsWidgets"
import {useStores} from "@renderer/stores/useStores"

function Sp500StatsImpl(): React.JSX.Element {
  const {sp500} = useStores()
  const quote = sp500.quote

  useEffect(() => {
    void sp500.loadFromCache()
  }, [sp500])

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
      title={SP500_WIDGET_TITLE} />
  )
}

export const Sp500Stats = observer(Sp500StatsImpl)
