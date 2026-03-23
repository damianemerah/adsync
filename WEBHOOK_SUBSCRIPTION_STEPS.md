# 🚨 NEXT STEPS: Meta Webhook Subscription

**Status:** ✅ Code deployed | ⚠️ Webhooks NOT YET ACTIVE | Action required

---

## 🔴 CRITICAL: Subscribe to New Webhook Fields

The webhook handlers are coded and deployed, but they **won't receive events** until you subscribe to the fields in Meta App Dashboard.

---

## Quick Setup (5 minutes)

### Step 1: Go to Meta App Dashboard
1. Visit: https://developers.facebook.com/apps/
2. Select your **Tenzu** app
3. Click **Webhooks** in left sidebar

### Step 2: Subscribe to Fields
1. Find the **Ad Account** object section
2. Click **Edit Subscription**
3. Check these boxes:
   - ✅ `adsets` ← **NEW** (ad set pauses)
   - ✅ `ads` ← **NEW** (ad rejections/approvals)
   - ✅ `campaigns` (already enabled)
   - ✅ `with_issues_ad_objects` (already enabled)
   - ✅ `ad_account_update` (already enabled)
   - ✅ `leadgen` (already enabled)
4. Click **Save**

### Step 3: Test Webhook
1. Click **Test** button next to the subscription
2. Verify response is **200 OK**
3. Check your app logs for test event

---

## Alternative: Programmatic Subscription

If you prefer using the API:

```bash
# Replace {ad-account-id} and {your-access-token}
curl -X POST "https://graph.facebook.com/v25.0/{ad-account-id}/subscribed_apps" \
  -d "subscribed_fields=adsets,ads,campaigns,with_issues_ad_objects,ad_account_update,leadgen" \
  -d "access_token={your-access-token}"
```

**Verify it worked:**
```bash
curl -X GET "https://graph.facebook.com/v25.0/{ad-account-id}/subscribed_apps" \
  -d "access_token={your-access-token}"
```

Expected output should include `"adsets"` and `"ads"` in the subscribed fields list.

---

## How to Test

### Test 1: Ad Set Pause (Easy)
1. Go to Meta Ads Manager
2. Find any active ad set
3. Click **Pause**
4. **Expected Result:**
   - Within seconds, check your Tenzu notifications
   - Should see: "⚠️ Ad Set Paused: Budget Issue"
   - Database: `ad_sets.status` should update to `"campaign_paused"`

### Test 2: Ad Approval (Requires Creating Ad)
1. Create a simple test ad in Meta
2. Submit for review
3. **Expected Result:**
   - When Meta approves: "✅ Ad Approved & Live" notification
   - Database: `ads.status` should update to `"active"`

### Test 3: Ad Rejection (Intentional Violation)
1. Create test ad with policy violation (e.g., "100% guaranteed results!")
2. Submit for review
3. **Expected Result:**
   - When Meta rejects: "❌ Ad Rejected by Meta" notification
   - Database: `ads.status` should update to `"disapproved"`

---

## Where to Check Logs

### Webhook Endpoint Logs
Check your Next.js API route logs for:
```
📊 Ad Set Status Change [123456]: CAMPAIGN_PAUSED
✅ Ad Set 123456 status updated: CAMPAIGN_PAUSED
```

### Database Verification
```sql
-- Check recent ad set status updates
SELECT platform_adset_id, status, created_at
FROM ad_sets
ORDER BY created_at DESC
LIMIT 10;

-- Check recent ad status updates
SELECT platform_ad_id, status, created_at
FROM ads
ORDER BY created_at DESC
LIMIT 10;
```

### User Notifications
```sql
-- Check recent webhook-triggered notifications
SELECT title, message, category, created_at
FROM notifications
WHERE category IN ('budget', 'campaign', 'account')
ORDER BY created_at DESC
LIMIT 10;
```

---

## Troubleshooting

### "Webhook not receiving events"
- ✅ Verify subscription via API call above
- ✅ Check webhook endpoint is publicly accessible (not localhost)
- ✅ Verify `META_WEBHOOK_VERIFY_TOKEN` and `META_APP_SECRET` env vars are set
- ✅ Check Meta App Dashboard for webhook errors

### "Getting duplicate notifications"
- ✅ Normal - Meta may send same webhook multiple times
- ✅ Our handlers are idempotent (update operations, not insert)
- ✅ Notifications use dedup keys to prevent spam

### "Status not updating in database"
- ✅ Check webhook logs for errors
- ✅ Verify ad/adset exists in your database with correct `platform_ad_id`/`platform_adset_id`
- ✅ Check org lookup succeeds (ads → campaigns → organization_id)

---

## What Happens When Webhooks Are Active?

**Before (Polling Only):**
- User's ad gets rejected
- **6 hours pass** while insights sync runs
- User sees notification 6 hours later
- "Why isn't my ad running?" support ticket

**After (Webhooks Active):**
- User's ad gets rejected
- **Webhook fires immediately** (< 1 second)
- User sees notification in real-time
- User can fix and resubmit right away
- No support ticket needed

---

## Success Checklist

Once you complete subscription and testing:

- [ ] Subscribed to `adsets` field in Meta App Dashboard
- [ ] Subscribed to `ads` field in Meta App Dashboard
- [ ] Tested ad set pause → received notification
- [ ] Tested ad approval → received notification
- [ ] Verified database status fields update correctly
- [ ] Checked webhook logs show incoming events
- [ ] Monitored for 48 hours - no missed events

---

## Additional Resources

- Full Implementation Details: [WEBHOOKS_IMPLEMENTATION_COMPLETE.md](WEBHOOKS_IMPLEMENTATION_COMPLETE.md)
- Original Plan: [docs/ADDITIONAL_WEBHOOKS_IMPLEMENTATION.md](docs/ADDITIONAL_WEBHOOKS_IMPLEMENTATION.md)
- Meta Webhooks Docs: https://developers.facebook.com/docs/graph-api/webhooks/getting-started/webhooks-for-ad-accounts/

---

**Last Updated:** 2026-03-26
**Status:** ⚠️ Awaiting webhook field subscription
**Estimated Time:** 5 minutes to subscribe + 30 minutes to test
