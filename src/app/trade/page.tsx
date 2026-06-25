import { redirect } from "next/navigation"
import { DEFAULT_TOKEN_MINT } from "@/lib/mock-data"

export default function TradeIndexPage() {
  redirect(`/trade/${DEFAULT_TOKEN_MINT}`)
}
