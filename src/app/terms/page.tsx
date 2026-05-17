import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use | Tenzu",
  description:
    "Read Tenzu's Terms of Use — covering subscriptions, AI credits, ad spend tiering, Meta API access, and Paystack billing for Nigerian SMEs.",
};

const LAST_UPDATED = "May 13, 2025";
const CONTACT_EMAIL = "hello@tenzu.africa";
const COMPANY_NAME = "Tenzu Technologies Limited";

const sections = [
  {
    id: "agreement",
    title: "1. Agreement to Terms",
    content: `These Terms of Use ("Agreement") form a binding contract between ${COMPANY_NAME} ("Tenzu", "we", "us", or "our") and any person or entity ("you", "Customer") accessing or using the Tenzu platform available at tenzu.africa ("Platform" or "Services").

By registering an account, clicking "I Accept", or using any part of our Services, you confirm that: (i) you have read and agree to this Agreement; (ii) you are at least 18 years of age; and (iii) if acting on behalf of a company or organization, you have the legal authority to bind that entity.

If you do not agree to these terms, you are not authorized to use the Services.`,
  },
  {
    id: "definitions",
    title: "2. Definitions",
    items: [
      {
        term: "Ad Account",
        def: "Any user account registered with a third-party advertising network (e.g., Meta/Facebook), connected to Tenzu for campaign management.",
      },
      {
        term: "Ad Spend",
        def: "The total monthly advertising expenditure across all Ad Accounts connected to your Tenzu account. Ad Spend is measured in Nigerian Naira (₦) and is used to determine your subscription tier. You are solely responsible for paying your Ad Spend directly to the advertising network — Tenzu does not hold, process, or guarantee these funds.",
      },
      {
        term: "AI Credits",
        def: "A consumable balance used to access Tenzu's AI-powered image generation features. Credits are allocated monthly by plan and may be topped up via in-app purchase. Text and copy generation is free and does not consume credits.",
      },
      {
        term: "Attribution Link",
        def: "A Tenzu-generated smart link (tenzu.africa/l/[token]) that wraps your ad destination URL to enable click tracking and WhatsApp attribution. All ad destinations must use Attribution Links — raw WhatsApp or website URLs are never sent directly to Meta.",
      },
      {
        term: "Subscription",
        def: "A recurring monthly access plan (Starter, Growth, or Agency) billed via Paystack that grants use of the Platform. Subscriptions auto-renew unless canceled.",
      },
      {
        term: "Platform",
        def: "Tenzu's proprietary software, including all dashboards, AI tools, campaign wizards, attribution systems, and APIs.",
      },
      {
        term: "Third-Party Services",
        def: "External platforms integrated with Tenzu, including Meta (Facebook/Instagram), Paystack, and OpenAI. Tenzu's access to these services is governed by their respective terms.",
      },
    ],
  },
  {
    id: "eligibility",
    title: "3. Eligibility & Registration",
    content: `To use Tenzu, you must be at least 18 years old. By accepting this Agreement, you confirm that your account has not been previously suspended from our Services, and that your use complies with all applicable Nigerian and international laws.

You are responsible for maintaining the confidentiality of your account credentials and for all activities conducted under your account. If you suspect unauthorized access, contact us immediately at ${CONTACT_EMAIL}.`,
  },
  {
    id: "subscription",
    title: "4. Subscription Plans & Billing",
    subsections: [
      {
        id: "plans",
        subtitle: "4.1 Subscription Plans",
        content: `Tenzu offers three subscription plans billed in Nigerian Naira (₦) via Paystack:`,
        table: {
          headers: ["Plan", "Monthly Price", "AI Credits", "Ad Accounts", "Team Members"],
          rows: [
            ["Starter", "₦10,000/mo", "50 credits", "1", "1 (Solo)"],
            ["Growth", "₦25,000/mo", "150 credits", "3", "3"],
            ["Agency", "₦65,000/mo", "250 credits", "Unlimited", "10"],
          ],
        },
      },
      {
        id: "trial",
        subtitle: "4.2 Free Trial",
        content: `All new users are eligible for a 7-day free trial, activated upon connecting a Meta Ad Account during onboarding. No charge is made during the trial period. You will be assigned the appropriate plan tier at the end of your trial based on your connected ad accounts and usage.`,
      },
      {
        id: "auto-tier",
        subtitle: "4.3 Automatic Plan Assignment (Spend-Based Tiering)",
        content: `Tenzu automatically assigns and adjusts your subscription plan based on your cumulative monthly Ad Spend across all connected Meta Ad Accounts. This ensures you always have the right level of access for your advertising volume.

Plan tiers are reviewed monthly. If your Ad Spend increases materially, you will receive a minimum of 7 days' advance notice before any automatic upgrade takes effect. If an immediate upgrade is required to maintain access to active campaign features, Tenzu will attempt notification within 24 hours.

Downgrade requests where your actual Ad Spend exceeds the lower tier's threshold will not be processed until your monthly spend naturally falls within that range.`,
      },
      {
        id: "billing",
        subtitle: "4.4 Payment & Billing Terms",
        content: `By initiating a subscription, you authorize Tenzu to charge the applicable monthly fee to your payment method via Paystack. All fees are stated and charged in Nigerian Naira (₦).

Refunds will not be issued for forgetting to cancel a subscription, not using the Platform, or partial use of a billing period. Tenzu does not currently offer annual subscription options.

Failed payments may result in a grace period of up to 3 days before your account is downgraded to read-only access. You will be notified by email for any payment failure.`,
      },
      {
        id: "pricing-changes",
        subtitle: "4.5 Pricing Modifications",
        content: `Tenzu reserves the right to modify subscription pricing, tier thresholds, and plan features. You will receive at least 30 days' written notice before any material price increase for voluntary plan changes, and at least 7 days' notice for automatic spend-based adjustments. Continued use after notice constitutes acceptance of the new pricing.`,
      },
    ],
  },
  {
    id: "ai-credits",
    title: "5. AI Credits",
    content: `AI Credits are consumed when you use Tenzu's AI-powered image generation features. The credit cost per action is:`,
    creditTable: {
      headers: ["Action", "Credits", "Notes"],
      rows: [
        ["Ad Copy / Strategy", "0 (Free)", "Text generation never costs credits"],
        ["Image Generation (FLUX 2 Pro)", "5 credits", "All plans"],
        ["Image Edit / Refinement", "3 credits", "Cheaper to encourage iteration"],
        ["WhatsApp Chat Overage", "1 credit/msg", "After monthly chat quota exhausted"],
      ],
    },
    creditAddendum: `Credits are allocated at the start of each billing cycle. Unused monthly credits do not roll over. Additional credits can be purchased at any time:

• Small Pack: 50 credits for ₦3,000
• Medium Pack: 120 credits for ₦6,500
• Large Pack: 300 credits for ₦15,000

Starter plan users who exhaust their credits will have image generation paused until the next billing cycle. Growth and Agency users on high usage may have their image model temporarily downgraded — platform access is never fully blocked due to credit exhaustion alone.`,
  },
  {
    id: "meta",
    title: "6. Meta API & Ad Account Access",
    content: `To use Tenzu, you must connect one or more Meta Ad Accounts and grant Tenzu access via the Meta Marketing API. By connecting your account, you authorize Tenzu to:

• Read campaign, ad set, ad, and performance data from your Meta Ad Accounts
• Create, edit, pause, and manage campaigns on your behalf
• Submit creatives and targeting configurations to Meta's API
• Monitor spend metrics for plan tier assignment

Tenzu stores your Meta access tokens in an encrypted format (AES-256-CBC). Decryption only occurs server-side during API calls. Tenzu is not responsible for any ad policy violations, account restrictions, or ad spend charges imposed by Meta as a result of campaigns created through the Platform.

Canceling your Tenzu subscription does not automatically pause your active Meta campaigns. Your ads will continue to run and accrue spend in your Meta Ad Account until you manually pause or stop them. We strongly recommend pausing active campaigns before canceling your subscription.`,
  },
  {
    id: "attribution",
    title: "7. Attribution Links & Smart Links",
    content: `All ad campaigns launched via Tenzu must use a Tenzu Attribution Link (tenzu.africa/l/[token]) as the ad destination. These smart links track WhatsApp clicks, website visits, and sales attribution for the ROI dashboard.

You agree not to modify, bypass, or circumvent Attribution Links. Tenzu retains click and attribution data for the duration defined by your plan tier (7 days for Starter, 30 days for Growth, Lifetime for Agency). Upon account deletion, attribution data is permanently removed within 30 days.`,
  },
  {
    id: "acceptable-use",
    title: "8. Acceptable Use",
    content: `You agree not to use Tenzu to create, promote, or distribute:

• Content that violates Meta's Advertising Policies or Community Standards
• Misleading, fraudulent, or deceptive advertising
• Content targeting minors with inappropriate products or services
• Prohibited product categories including tobacco, certain financial services (without required disclosures), or illegal goods

All ad copy submitted for launch is automatically scanned by Tenzu's Policy Guard. Content flagged as HIGH risk will be blocked from submission to Meta. MEDIUM risk content will receive a warning. You are ultimately responsible for ensuring your ads comply with all applicable advertising regulations.`,
  },
  {
    id: "data",
    title: "9. Data & Privacy",
    content: `Tenzu collects account data (name, email, connected Meta accounts), campaign data (ads, budgets, performance metrics), payment records (processed by Paystack — we do not store full card details), and platform usage data.

Your data is used solely to provide and improve the Services. Tenzu will not sell your personal data to third parties. We may transfer data to sub-processors (Supabase, Vercel, OpenAI, Paystack) strictly for service delivery.

In the event of a security breach affecting your data, Tenzu will notify you within 72 hours of becoming aware of the incident, unless prohibited by law.

For a full description of how we handle your data, see our Privacy Policy at tenzu.africa/privacy.`,
  },
  {
    id: "ip",
    title: "10. Intellectual Property",
    content: `All Platform content — including software, AI models, creative templates, and design — is the property of Tenzu Technologies Limited and protected under applicable copyright law.

Content you create using Tenzu (ad copy, generated images) belongs to you. By using the Platform, you grant Tenzu a limited, non-exclusive license to process and display your content solely to provide the Services.

You may not reverse-engineer, scrape, or create derivative works from the Tenzu Platform without express written consent.`,
  },
  {
    id: "liability",
    title: "11. Limitation of Liability",
    content: `TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, TENZU'S TOTAL LIABILITY FOR ANY CLAIM ARISING FROM THESE TERMS SHALL NOT EXCEED THE FEES YOU PAID IN THE THREE (3) MONTHS PRECEDING THE CLAIM.

TENZU IS NOT LIABLE FOR: (i) INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES; (ii) LOSS OF REVENUE, DATA, OR BUSINESS OPPORTUNITY; (iii) AD SPEND CHARGES INCURRED ON META OR OTHER PLATFORMS; (iv) POLICY VIOLATIONS IMPOSED BY META ON YOUR AD ACCOUNTS.

Tenzu is not responsible for service interruptions caused by Meta API outages, Paystack downtime, or other third-party service failures.`,
  },
  {
    id: "termination",
    title: "12. Termination & Cancellation",
    content: `You may cancel your subscription at any time through your account settings or by contacting ${CONTACT_EMAIL}. Cancellation takes effect at the end of your current billing period. You will retain read-only access to your dashboard until the period expires.

Tenzu may suspend or terminate your account immediately for material breach of this Agreement, including violation of acceptable use policies or non-payment.

Upon termination: your data will be retained for 30 days during which you may request an export, after which it will be permanently deleted.`,
  },
  {
    id: "modifications",
    title: "13. Modifications to Terms",
    content: `Tenzu reserves the right to update these Terms at any time. Material changes will be communicated via email and/or an in-app notice at least 14 days before they take effect. Continued use of the Platform after changes constitutes your acceptance of the updated Terms.`,
  },
  {
    id: "governing-law",
    title: "14. Governing Law",
    content: `This Agreement is governed by the laws of the Federal Republic of Nigeria. Any disputes arising from or related to this Agreement shall be subject to the exclusive jurisdiction of the courts of Lagos State, Nigeria.`,
  },
  {
    id: "contact",
    title: "15. Contact Us",
    content: `If you have any questions, concerns, or disputes regarding these Terms, please contact us at:

Tenzu Technologies Limited
Lagos, Nigeria
Email: ${CONTACT_EMAIL}
Website: tenzu.africa`,
  },
];

export default function TermsOfUsePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-12 md:py-16">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">
            Legal
          </p>
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground leading-tight mb-3">
            Terms of Use
          </h1>
          <p className="text-subtle-foreground text-sm">
            Last updated: {LAST_UPDATED} &mdash; Effective immediately for all new accounts.
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-4xl mx-auto px-6 py-12 md:py-16">
        <div className="flex flex-col lg:flex-row gap-12">

          {/* Sidebar TOC */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-8">
              <p className="text-[11px] font-bold text-subtle-foreground uppercase tracking-widest mb-4">
                Contents
              </p>
              <nav className="space-y-1">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="block text-sm text-subtle-foreground hover:text-foreground transition-colors py-1 leading-snug"
                  >
                    {s.title.replace(/^\d+\.\s/, "")}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <article className="flex-1 min-w-0 space-y-12">
            {/* Intro banner */}
            <div className="rounded-lg border border-border bg-muted/50 p-5">
              <p className="text-sm text-subtle-foreground leading-relaxed">
                <span className="font-semibold text-foreground">Plain-language summary:</span>{" "}
                Tenzu is a subscription-based ad management platform for Nigerian SMEs. You pay a
                monthly Naira fee for platform access. Your ad spend goes directly to Meta — Tenzu
                never touches that money. You get AI credits each month for image generation. Your
                plan tier can automatically adjust based on how much you spend on ads each month.
                Text and copy generation is always free.
              </p>
            </div>

            {sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-8">
                <h2 className="text-lg font-heading font-bold text-foreground mb-4 pb-2 border-b border-border">
                  {section.title}
                </h2>

                {/* Definition list */}
                {section.items && (
                  <dl className="space-y-4">
                    {section.items.map((item) => (
                      <div key={item.term}>
                        <dt className="text-sm font-semibold text-foreground">{item.term}</dt>
                        <dd className="text-sm text-subtle-foreground mt-1 leading-relaxed">
                          {item.def}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}

                {/* Subsections */}
                {section.subsections && (
                  <div className="space-y-8">
                    {section.subsections.map((sub) => (
                      <div key={sub.id}>
                        <h3 className="text-sm font-bold text-foreground mb-2">{sub.subtitle}</h3>
                        <p className="text-sm text-subtle-foreground leading-relaxed whitespace-pre-line mb-4">
                          {sub.content}
                        </p>
                        {sub.table && (
                          <div className="overflow-x-auto rounded-lg border border-border">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-muted border-b border-border">
                                  {sub.table.headers.map((h) => (
                                    <th
                                      key={h}
                                      className="text-left px-4 py-2.5 text-xs font-bold text-subtle-foreground uppercase tracking-wide"
                                    >
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {sub.table.rows.map((row, i) => (
                                  <tr
                                    key={i}
                                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                                  >
                                    {row.map((cell, j) => (
                                      <td
                                        key={j}
                                        className={`px-4 py-3 ${j === 0 ? "font-medium text-foreground" : "text-subtle-foreground"}`}
                                      >
                                        {cell}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Credit table */}
                {section.creditTable && (
                  <div className="space-y-4">
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted border-b border-border">
                            {section.creditTable.headers.map((h) => (
                              <th
                                key={h}
                                className="text-left px-4 py-2.5 text-xs font-bold text-subtle-foreground uppercase tracking-wide"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {section.creditTable.rows.map((row, i) => (
                            <tr
                              key={i}
                              className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                            >
                              {row.map((cell, j) => (
                                <td
                                  key={j}
                                  className={`px-4 py-3 ${j === 0 ? "font-medium text-foreground" : j === 1 ? "text-primary font-semibold" : "text-subtle-foreground"}`}
                                >
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {section.creditAddendum && (
                      <p className="text-sm text-subtle-foreground leading-relaxed whitespace-pre-line">
                        {section.creditAddendum}
                      </p>
                    )}
                  </div>
                )}

                {/* Plain content */}
                {section.content && (
                  <p className="text-sm text-subtle-foreground leading-relaxed whitespace-pre-line">
                    {section.content}
                  </p>
                )}
              </section>
            ))}

            {/* Footer note */}
            <div className="rounded-lg border border-border bg-muted/50 p-5 mt-12">
              <p className="text-xs text-subtle-foreground leading-relaxed">
                Questions about these terms?{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-primary font-medium hover:underline"
                >
                  {CONTACT_EMAIL}
                </a>
                . Tenzu is built for Nigerian SMEs — if anything in these terms is unclear,
                reach out and we will explain it plainly.
              </p>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
