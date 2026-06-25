import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Terms of Use" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="June 23, 2026">
      <section>
        <h2>Informational interface</h2>
        <p>
          Market information is provided for demonstration and informational
          purposes. It is not financial, investment, tax or legal advice.
          Digital assets are volatile and may lose all value.
        </p>
      </section>
      <section>
        <h2>Non-custodial transactions</h2>
        <p>
          You are responsible for reviewing token addresses, amounts, price
          impact, fees and minimum received before approving any transaction.
          Blockchain transactions may be irreversible.
        </p>
      </section>
      <section>
        <h2>Third-party services</h2>
        <p>
          The assessment can integrate with Privy, Birdeye, Alchemy, Jupiter,
          Supabase and Solana. Their independent terms and availability apply.
        </p>
      </section>
      <section>
        <h2>No guaranteed returns</h2>
        <p>
          ChadWallet does not guarantee profits, token performance, liquidity
          or execution. Do your own research before interacting with a token.
        </p>
      </section>
    </LegalPage>
  );
}
