export const metadata = {
  title: "Privacy Policy — Virtual Crew S&OP",
  description: "Privacy policy for the Virtual Crew Sales & Operations Planning dashboard.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-foreground">
      <h1 className="font-heading text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Last updated: April 7, 2026
      </p>

      <section className="space-y-6 text-sm leading-relaxed">
        <p>
          Virtual Crew S&amp;OP (the &quot;Service&quot;) is an internal sales
          and operations planning dashboard operated by{" "}
          <strong>Beta AI / EXL Partners</strong> for the exclusive use of{" "}
          <strong>Agua de Madre Ltd</strong>. This policy explains what data we
          process, how we use it, and how you can contact us.
        </p>

        <h2 className="text-lg font-semibold mt-8">1. Data we process</h2>
        <p>When connected, the Service may access the following data:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>
            <strong>Shopify:</strong> orders (line items, totals, dates),
            products (SKU, title, variants, inventory), customers (count, type
            new/returning).
          </li>
          <li>
            <strong>Meta Ads:</strong> ad spend, impressions, clicks,
            conversions, CTR, CPC, ROAS by campaign and account.
          </li>
          <li>
            <strong>Amazon (when connected):</strong> seller orders, ad
            campaigns, inventory snapshots.
          </li>
        </ul>
        <p>
          We do <strong>not</strong> store individual customer personal
          information (names, emails, addresses, payment details). All metrics
          are aggregated at the order/SKU/campaign level.
        </p>

        <h2 className="text-lg font-semibold mt-8">2. How we use it</h2>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Display sales, marketing, and inventory dashboards.</li>
          <li>Compute demand forecasts and seasonality indices.</li>
          <li>Generate Claude-powered analysis and recommendations.</li>
          <li>Trigger scheduled syncs to keep data fresh.</li>
        </ul>

        <h2 className="text-lg font-semibold mt-8">3. Data storage</h2>
        <p>
          Data is stored in a Supabase Postgres database hosted in the{" "}
          <strong>EU West 2 (London)</strong> region. Supabase encrypts the
          underlying database storage at rest at the infrastructure layer.
          Access to the dashboard and API is restricted to authorized personnel
          from Beta AI / EXL Partners and Agua de Madre Ltd via server-side
          credentials and same-origin enforcement.
        </p>

        <h2 className="text-lg font-semibold mt-8">4. Data retention</h2>
        <p>
          Operational data (orders, ad spend, inventory) is retained as long
          as the account is active. On disconnection or upon written request,
          data is deleted within 30 days.
        </p>

        <h2 className="text-lg font-semibold mt-8">5. Third parties</h2>
        <p>We send data to the following third parties to operate the Service:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>
            <strong>Anthropic (Claude):</strong> aggregated metrics are sent for
            forecast analysis and chat responses. Anthropic does not train on
            this data.
          </li>
          <li>
            <strong>Vercel:</strong> hosts the application. Logs may include
            request metadata.
          </li>
          <li>
            <strong>Supabase:</strong> database and auth provider.
          </li>
        </ul>

        <h2 className="text-lg font-semibold mt-8">6. Your rights (GDPR)</h2>
        <p>
          You may request access to, correction of, or deletion of your data at
          any time. We honor data subject requests within 30 days.
        </p>

        <h2 className="text-lg font-semibold mt-8">7. Contact</h2>
        <p>
          For privacy questions or data requests, contact{" "}
          <a
            href="mailto:pablo@b-ta.ai"
            className="text-primary underline underline-offset-2"
          >
            pablo@b-ta.ai
          </a>
          .
        </p>
      </section>
    </main>
  );
}
