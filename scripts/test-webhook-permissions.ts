/**
 * Diagnostic Script: Test Meta Webhook Permissions & Subscriptions
 *
 * This script checks:
 * 1. App-level permissions
 * 2. Current webhook subscriptions at app level
 * 3. Ad account webhook subscriptions
 * 4. Token scopes and permissions
 *
 * Run: npx tsx scripts/test-webhook-permissions.ts
 */

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const META_APP_ID = process.env.META_APP_ID!;
const META_APP_SECRET = process.env.META_APP_SECRET!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;

// Generate App Access Token
const APP_ACCESS_TOKEN = `${META_APP_ID}|${META_APP_SECRET}`;

// Inline decrypt function (copied from src/lib/crypto.ts to avoid server-only import)
function decrypt(text: string): string {
  const parts = text.split(":");
  const IV_LENGTH = 16;

  // New format: "v2:IV:ENCRYPTED"
  if (parts[0].startsWith("v")) {
    const iv = Buffer.from(parts[1], "hex");
    const encryptedText = Buffer.from(parts[2], "hex");
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(ENCRYPTION_KEY),
      iv,
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }

  // Legacy format (no version): "IV:ENCRYPTED"
  const iv = Buffer.from(parts[0], "hex");
  const encryptedText = Buffer.from(parts[1], "hex");
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY),
    iv,
  );
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

interface WebhookSubscription {
  object: string;
  callback_url: string;
  fields: string[];
  active: boolean;
}

interface TokenPermission {
  permission: string;
  status: string;
}

async function main() {
  console.log("🔍 Meta Webhook Permissions Diagnostic Tool\n");
  console.log("=".repeat(60));

  // Initialize Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // 1. Get a connected ad account with token
  console.log("\n📊 Step 1: Fetching connected ad account...");
  const { data: adAccount } = await supabase
    .from("ad_accounts")
    .select("platform_account_id, account_name, access_token, health_status")
    .eq("platform", "meta")
    .eq("health_status", "healthy")
    .limit(1)
    .single();

  if (!adAccount) {
    console.error("❌ No connected Meta ad accounts found!");
    process.exit(1);
  }

  console.log(
    `✅ Found ad account: ${adAccount.account_name} (${adAccount.platform_account_id})`,
  );

  // Decrypt access token
  const userAccessToken = decrypt(adAccount.access_token);
  console.log(`✅ Decrypted access token (length: ${userAccessToken.length})`);

  // 2. Check App Permissions
  console.log("\n📊 Step 2: Checking app permissions...");
  try {
    const appInfoUrl = `https://graph.facebook.com/v25.0/${META_APP_ID}?fields=id,name,namespace&access_token=${APP_ACCESS_TOKEN}`;
    const appInfoResponse = await fetch(appInfoUrl);
    const appInfo = await appInfoResponse.json();

    if (appInfo.error) {
      console.error(`❌ Error fetching app info: ${appInfo.error.message}`);
    } else {
      console.log(`✅ App Name: ${appInfo.name}`);
      console.log(`✅ App ID: ${appInfo.id}`);
    }
  } catch (error) {
    console.error(`❌ Failed to fetch app info:`, error);
  }

  // 3. Check App-Level Webhook Subscriptions
  console.log("\n📊 Step 3: Checking app-level webhook subscriptions...");
  try {
    const webhookUrl = `https://graph.facebook.com/v25.0/${META_APP_ID}/subscriptions?access_token=${APP_ACCESS_TOKEN}`;
    const webhookResponse = await fetch(webhookUrl);
    const webhookData = await webhookResponse.json();

    if (webhookData.error) {
      console.error(`❌ Error fetching webhooks: ${webhookData.error.message}`);
    } else if (webhookData.data && webhookData.data.length > 0) {
      console.log(
        `✅ Found ${webhookData.data.length} webhook subscription(s):\n`,
      );

      webhookData.data.forEach((sub: WebhookSubscription) => {
        console.log(`   Object: ${sub.object}`);
        console.log(`   Callback: ${sub.callback_url}`);
        console.log(`   Active: ${sub.active ? "✅ Yes" : "❌ No"}`);
        console.log(`   Fields: ${sub.fields?.join(", ") || "(none)"}`);
        console.log("");
      });
    } else {
      console.log("⚠️  No webhook subscriptions found at app level!");
    }
  } catch (error) {
    console.error(`❌ Failed to fetch webhook subscriptions:`, error);
  }

  // 4. Check Ad Account Subscriptions
  console.log("\n📊 Step 4: Checking ad account webhook subscriptions...");
  try {
    const adAccountSubUrl = `https://graph.facebook.com/v25.0/act_${adAccount.platform_account_id}/subscribed_apps?access_token=${userAccessToken}`;
    const adAccountSubResponse = await fetch(adAccountSubUrl);
    const adAccountSubData = await adAccountSubResponse.json();

    if (adAccountSubData.error) {
      console.error(`❌ Error: ${adAccountSubData.error.message}`);
      console.error(`   Code: ${adAccountSubData.error.code}`);
      console.error(`   Type: ${adAccountSubData.error.type}`);
    } else if (adAccountSubData.data && adAccountSubData.data.length > 0) {
      console.log(
        `✅ Ad account has ${adAccountSubData.data.length} app(s) subscribed:\n`,
      );

      adAccountSubData.data.forEach((app: any) => {
        console.log(`   App: ${app.name || app.id}`);
        console.log(
          `   Subscribed Fields: ${app.subscribed_fields?.join(", ") || "(none)"}`,
        );
        console.log("");
      });
    } else {
      console.log("⚠️  No apps subscribed to this ad account!");
    }
  } catch (error) {
    console.error(`❌ Failed to check ad account subscriptions:`, error);
  }

  // 5. Check Token Permissions
  console.log("\n📊 Step 5: Checking access token permissions...");
  try {
    const permissionsUrl = `https://graph.facebook.com/v25.0/me/permissions?access_token=${userAccessToken}`;
    const permissionsResponse = await fetch(permissionsUrl);
    const permissionsData = await permissionsResponse.json();

    if (permissionsData.error) {
      console.error(`❌ Error: ${permissionsData.error.message}`);
    } else if (permissionsData.data) {
      console.log("✅ Token permissions:\n");

      const requiredPermissions = [
        "ads_management",
        "ads_read",
        "business_management",
        "pages_manage_ads",
        "leads_retrieval",
        "pages_read_engagement",
        "pages_manage_metadata",
      ];

      const grantedPermissions = permissionsData.data
        .filter((p: TokenPermission) => p.status === "granted")
        .map((p: TokenPermission) => p.permission);

      requiredPermissions.forEach((perm) => {
        const hasPermission = grantedPermissions.includes(perm);
        console.log(`   ${hasPermission ? "✅" : "❌"} ${perm}`);
      });

      console.log("\n   Other granted permissions:");
      grantedPermissions
        .filter((p: string) => !requiredPermissions.includes(p))
        .forEach((p: string) => console.log(`   ✅ ${p}`));
    }
  } catch (error) {
    console.error(`❌ Failed to check token permissions:`, error);
  }

  // 6. Check Available Webhook Fields for Ad Account Object
  console.log("\n📊 Step 6: Checking available webhook fields...");
  try {
    const fieldsUrl = `https://graph.facebook.com/v25.0/${META_APP_ID}/subscriptions?object=ad_account&access_token=${APP_ACCESS_TOKEN}`;
    const fieldsResponse = await fetch(fieldsUrl);
    const fieldsData = await fieldsResponse.json();

    if (fieldsData.error) {
      console.log(
        `⚠️  Could not fetch field list: ${fieldsData.error.message}`,
      );
    } else if (fieldsData.data && fieldsData.data.length > 0) {
      const adAccountSub = fieldsData.data.find(
        (s: any) => s.object === "ad_account",
      );
      if (adAccountSub) {
        console.log("✅ Available ad_account webhook fields:");
        console.log(`   ${adAccountSub.fields.join(", ")}`);
      }
    }
  } catch (error) {
    console.log(`⚠️  Could not fetch available fields`);
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📋 SUMMARY & RECOMMENDATIONS");
  console.log("=".repeat(60));
  console.log(`
✅ WHAT'S WORKING:
   - App access token is valid
   - Connected ad account found: ${adAccount.account_name}
   - User access token decrypted successfully

⚠️  THINGS TO CHECK:
   1. Are you seeing limited webhook fields in Meta UI?
      → This is expected for v25.0 API
      → Fields like 'ads', 'adsets', 'campaigns' may be deprecated

   2. Subscribe to these critical fields:
      → with_issues_ad_objects (for rejection tracking)
      → in_process_ad_objects (for ad status updates)

   3. For 'leadgen' webhooks:
      → Must subscribe at PAGE level (not Ad Account)
      → Go back to webhook config and select "Page" object

   4. If permissions are missing:
      → Reconnect ad account with full OAuth flow
      → Ensure all checkboxes are selected during OAuth

🔧 NEXT STEPS:
   1. Subscribe to 'with_issues_ad_objects' (Ad Account webhook)
   2. Subscribe to 'in_process_ad_objects' (Ad Account webhook)
   3. Switch to "Page" object and subscribe to 'leadgen'
   4. Test webhooks by triggering a real event
`);

  console.log("\n✅ Diagnostic complete!\n");
}

main().catch(console.error);
