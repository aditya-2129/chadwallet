import { TradeShell } from "@/components/trading/trade-shell"

export default async function TradeMintPage({
  params,
}: {
  params: Promise<{ mint: string }>
}) {
  const { mint } = await params
  return <TradeShell mint={mint} />
}
