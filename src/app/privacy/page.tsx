export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-6 font-sans">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy for AdSync</h1>
      <p className="mb-4">Last updated: January 16, 2026</p>

      <div className="space-y-6 text-slate-700">
        <section>
          <h2 className="text-xl font-semibold mb-2">1. Introduction</h2>
          <p>
            AdSync ("we", "our") respects your privacy. This policy explains how
            we handle your data when you use our ad management services.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">2. Data We Collect</h2>
          <ul className="list-disc pl-5">
            <li>
              **Account Information:** Name, email, and profile picture from
              Facebook/Google.
            </li>
            <li>
              **Ad Data:** We access your Ad Accounts, Campaigns, and Insights
              via the Meta Marketing API to provide dashboard analytics.
            </li>
            <li>
              **Payment Data:** Processed securely via Paystack. We do not store
              full card details.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">
            3. How We Use Your Data
          </h2>
          <p>We use your data solely to:</p>
          <ul className="list-disc pl-5">
            <li>Create and manage your advertising campaigns.</li>
            <li>Provide performance analytics and AI recommendations.</li>
            <li>Process subscription payments.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">4. Data Deletion</h2>
          <p>
            You may request deletion of your data at any time by contacting
            support@adsync.com or using the "Delete Account" feature in
            Settings.
          </p>
        </section>
      </div>
    </div>
  );
}
