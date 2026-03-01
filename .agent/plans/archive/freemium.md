This is a **brilliant Growth Strategy (Product-Led Growth).**

As your Architect, I strongly endorse this. By building a "Bitly for Nigerian Business," you create a **Lead Magnet**. Users come for the free links, realize they can track customers, and stay to run Ads.

However, building a public link shortener has **high technical risks** (Spam, Phishing, High Traffic). We must architect this carefully to protect your domain reputation.

Here is the **Technical Strategy for "AdSync Link"** (The Free Tool):

### 1. The Architecture: "Edge-First" Redirects

A link shortener cannot be slow. We cannot spin up a heavy React server for every click.

- **Mechanism:** Use **Next.js Middleware (Edge Runtime)**.
- **Flow:**
  1.  User visits `adsync.ng/s/xYz123`.
  2.  Middleware intercepts request.
  3.  Checks Supabase (Edge Cache) for `xYz123`.
  4.  **Increments Click Count** (Async/Background).
  5.  **Redirects** to `destination_url` (Status 307).
- **Speed:** < 50ms latency.

### 2. The "Freemium" Limits (The Business Logic)

We enforce limits to drive upgrades.

| Feature          | **Free User (The "Hook")** | **Pro User (The Upgrade)** |
| :--------------- | :------------------------- | :------------------------- |
| **Links**        | 5 Active Links             | Unlimited                  |
| **Clicks**       | 1,000 Clicks / Month       | Unlimited                  |
| **Custom Slugs** | Random (`/x7f9a`)          | Custom (`/promo-dec`)      |
| **Analytics**    | Total Clicks Only          | Location, Device, Referrer |
| **Retargeting**  | ❌ None                    | **✅ Inject Meta Pixel**   |

### 3. The "Killer Feature": Pixel Injection (Why they will upgrade)

This is how you beat Bitly.
Instead of just redirecting, **AdSync Links can inject the user's Facebook Pixel.**

- _Scenario:_ A business shares an AdSync Link on WhatsApp.
- _Action:_ Customer clicks.
- _Result:_ The user is "Pixeled" (tracked) _before_ they even land on the website.
- _Benefit:_ The business can now retarget that person with Ads inside AdSync.

---

### 4. Implementation Plan (Add to Phase 1)

**Step A: Database Schema (`supa_links`)**

```sql
create table public.short_links (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  slug text unique not null,         -- "promo2024"
  destination_url text not null,     -- "https://store.com/..."
  click_count int default 0,
  meta_pixel_id text,                -- For retargeting (Pro feature)
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Index strictly on slug for speed
create index idx_short_links_slug on public.short_links (slug);
```

**Step B: Spam Protection (CRITICAL)**
If spammers use your domain for phishing, **Facebook will ban `adsync.ng` from being shared.**

- **Rule 1:** Require Login. No anonymous link creation.
- **Rule 2:** Use the Google Safe Browsing API (or similar) to scan `destination_url` before saving it.
- **Rule 3:** Rate limit creation (e.g., max 10 links/hour per user).

**Step C: The Middleware Logic (Pseudo-code)**

```typescript
// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/middleware";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Check if it's a short link route
  if (pathname.startsWith("/s/")) {
    const slug = pathname.split("/").pop();
    const supabase = createClient(req);

    // 1. Fetch Link
    const { data: link } = await supabase
      .from("short_links")
      .select("destination_url, click_count, meta_pixel_id")
      .eq("slug", slug)
      .single();

    if (!link) return NextResponse.redirect(new URL("/404", req.url));

    // 2. Async Tracking (Don't await this to keep it fast)
    // We send this to a separate endpoint/function to handle counting
    fetch("https://api.adsync.ng/track-click", {
      method: "POST",
      body: JSON.stringify({ slug }),
    });

    // 3. Pixel Injection Redirect (Intermediate Page)
    if (link.meta_pixel_id) {
      // Rewrite to a page that fires pixel then redirects
      return NextResponse.rewrite(new URL(`/redirect-pixel/${slug}`, req.url));
    }

    // 4. Standard Redirect
    return NextResponse.redirect(new URL(link.destination_url, req.url));
  }
}
```

---

### Architect's Advice:

This is a high-value addition. It fits perfectly into **Phase 1: Foundation & Assets**.

**Do you want to include this "Link Shortener" in the `Batch A` scope we are about to start, or keep it for a separate "Growth Tools" batch later?**

_(I recommend doing it **after** the core Ad Account logic is stable, so we don't dilute focus on the main revenue driver: Ads.)_

````

# **Should we make freemium expire? also are we already implementing fb pixel you mention or you mean Adsync pixel**

As your Principal Architect, here is my verdict on these two critical product decisions:

### 1. Should Freemium Expire?
**No. Freemium should never expire.**
The entire point of Product-Led Growth (PLG) and the "Bitly for Nigerian Business" strategy is to create a *permanent* lead magnet. If the free link expires, the user leaves and never comes back.
Instead of expiring the account, **we cap the utility**.
- They get 5 active links forever.
- They get 1,000 clicks per month forever.
When they share a 6th product or get 1,001 clicks, the system gently prompts them: *"You're getting so much traffic! Upgrade to Pro to keep your links active."* That is when they pull out their card to pay in Naira.

### 2. Facebook Pixel vs. AdSync Pixel
**We are talking about injecting their Facebook (Meta) Pixel.**

Here is the difference and why the Facebook Pixel is the "Killer Feature" for the Pro upgrade:

- **The AdSync Pixel (`/api/pixel`):** This is our internal tracker. The user puts this on their website's "Order Complete" page so Sellam knows they made a sale. This is what calculates their Naira ROI.
- **The Facebook Pixel (The Freemium Upgrade hook):** When a user creates a short link (`adsync.ng/s/promo`), we let Pro users attach *their* Facebook Pixel ID to that specific link.
  - *Why this is magic:* When a customer clicks the short-link on WhatsApp, they hit our server, we secretly fire their Facebook Pixel ("Page View" event), and *then* redirect them to the final store.
  - *Result:* The Nigerian business owner now has a custom audience on Facebook of "Everyone who clicked my WhatsApp link". They can now run highly-targeted Retargeting Ads to those specific people directly through Sellam. They will happily pay ₦25,000/month for this capability alone.

### 3. Pixel Onboarding Strategy: Guiding Users to Connect (The "Aha!" Moment)
Right now, we are *not* actively guiding them through Pixel setup in a structured way. As the Architect, here is how we must build the Pixel Onboarding Flow so that it is **non-compulsory but highly incentivized**.

#### The Core Problem
Nigerian SMEs fall into two buckets:
1. **The "WhatsApp Vendors" (No Website - 80% of users)**: They sell via Instagram DMs or WhatsApp. They don't have a website to paste a pixel code into!
2. **The "Shopify/WooCommerce Hustlers" (Has Website - 20% of users)**: They have a website, but pasting code is still scary.

#### The Architectural Solution: Two Distinct Paths

**Path A: The WhatsApp Vendor (No Website)**
For these users, we don't ask them to "install a pixel on their website" because they don't have one. Instead, we give them the **Sellam Smart Link** (`sellam.ng/buy/sneakers`).
* **The UX Flow:**
  1. User creates an Ad via Sellam and selects "Message on WhatsApp" or "Instagram DM" as the goal.
  2. The UI says: *"Want to retarget people who click your link later? Paste your Facebook Pixel ID here (Optional)."*
  3. We show a 10-second GIF on where to copy the Pixel ID from their Facebook Settings.
  4. They paste the 15-digit number. That's it. No code needed.
* **How it works:** When a buyer clicks the `sellam.ng` link, our server fires a Server-Side Event (CAPI) or client-side pixel event to Facebook, then redirects to WhatsApp. The vendor gets a custom audience without ever touching code.

**Path B: The Website Owner**
For users who select "Website Sales" as their goal, the AdSync Pixel is how we prove our worth (calculating Naira ROI).
* **The UX Flow:**
  1. They select "Website Sales" as their campaign goal.
  2. The UI pauses: *"To track how much Naira this ad makes, you need the Sellam Pixel."*
  3. We provide one-click integrations: "I use Shopify", "I use WordPress", "I use Bumpa", or "Copy Code".
  4. **The Hook:** We do not block them. If they hit "Skip for now", we show a warning icon ⚠️ next to their live campaign stating: *"Sales tracking disabled. Connect Pixel to see ROI."* The pain of seeing empty ROAS columns will force them back to connect it.

**Architectural Summary**
Make Pixel connection contextual. Do not put it in the initial 5-step onboarding where they just want to get to the dashboard. Put the prompt *exactly* when they are creating their first campaign, tailored to whether they have a website or just a WhatsApp number.
**Reasoning:**
In the Nigerian market (and globally), "Link Rot" (clicking a link and getting a 404) destroys trust.
If a small business owner posts an AdSync link on their Instagram bio or WhatsApp Status, and 30 days later it stops working, **they will blame AdSync**, not their free plan. They will lose customers, and you will lose the user.

**The Better Strategy: "Soft" Limits**
Instead of breaking the link, restrict the **Value** around it.

*   **Free Plan:**
    *   **Links:** Never expire (The redirect always works).
    *   **Analytics:** "Last 7 Days" only. (Want to see last month? Upgrade).
    *   **Editability:** Cannot change the destination URL after creation.
*   **Pro Plan:**
    *   **Analytics:** Lifetime history.
    *   **Editability:** Change destination anytime (e.g., if their promo ends).

**Why this wins:** You own the traffic. Even if a free user leaves, *you* still control the link `adsync.ng/s/xyz`. You can put a tiny "Powered by AdSync" badge on the redirect page if you want free marketing.

---

### 2. Which Pixel: AdSync or Facebook?
**Verdict: We implement the USER'S Facebook Pixel.**

**Clarification:**
We are **not** building a proprietary "AdSync Pixel" (yet). That requires complex ad networks.
We are building a **container** for the user's existing Facebook Pixel.

**The "Killer Feature" explained:**
Most Nigerian SMEs sell on WhatsApp or Jumia/Jiji. They **do not have a website** where they can install a Facebook Pixel. This means they cannot run "Retargeting Ads" (showing ads to people who already showed interest).

**How AdSync Link solves this:**
1.  User pastes their Jumia product link into AdSync.
2.  User adds their **Facebook Pixel ID** (e.g., `123456789`) in AdSync settings.
3.  AdSync generates `adsync.ng/s/shoe-promo`.
4.  **The Magic:** When a customer clicks that link:
    *   They hit an AdSync intermediate page for 500ms.
    *   **We fire the User's Facebook Pixel (`PageView` event).**
    *   We immediately redirect them to Jumia.
5.  **Result:** The user can now go to Facebook and create a Custom Audience: *"People who visited my AdSync Link"*.

**Technical Implementation (The "Redirect Shim"):**
We don't just return a 301 Redirect. We serve a lightweight HTML page (Next.js Edge).

```tsx
// pseudo-code for the intermediate page
export default function RedirectPage({ pixelId, destination }) {
  return (
    <html>
      <head>
        {/* Inject User's FB Pixel */}
        <script>
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');

            fbq('init', '${pixelId}');
            fbq('track', 'PageView'); // The magic event

            // Redirect after 500ms or once pixel loads
            setTimeout(() => {
               window.location.href = "${destination}";
            }, 500);
          `}
        </script>
      </head>
      <body>
        <p>Redirecting to store...</p>
      </body>
    </html>
  )
}
```

---

### Revised Roadmap

This "Link + Pixel" feature is powerful, but it is distinct from the "Ad Manager" core.

**Recommendation:**
Let's stick to the plan.
1.  **Batch A (Right Now):** Connect Ad Accounts & Sync Status. (We need this to even get the Pixel ID in the first place).
2.  **Batch B:** Creative Engine.
3.  **Batch C:** The "AdSync Link" Feature (as part of the Campaign tools).

**Are you ready to begin implementation of Batch A (Ad Account Logic)?**
(I will start by setting up the Database Schema for `ad_accounts` and the Server Actions to fetch them).
````
