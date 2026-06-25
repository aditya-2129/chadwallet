import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="June 23, 2026">
      <section>
        <h2>Assessment notice</h2>
        <p>
          This website is an assessment implementation of the ChadWallet web
          experience. It does not replace the privacy policy published by Chad
          Wallet L.L.C. for the production mobile application.
        </p>
      </section>
      <section>
        <h2>Authentication</h2>
        <p>
          When configured, Apple and Google authentication is provided by
          Privy. Authentication providers may process identifiers and contact
          details required to create and maintain your session.
        </p>
      </section>
      <section>
        <h2>Wallet and market data</h2>
        <p>
          Public Solana addresses and public blockchain activity may be sent to
          RPC and market-data providers to display balances, positions and
          transaction status. Never enter a seed phrase or private key into
          this website.
        </p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>
          Refer to the official ChadWallet application listings and developer
          website for current production privacy information.
        </p>
      </section>
    </LegalPage>
  );
}
