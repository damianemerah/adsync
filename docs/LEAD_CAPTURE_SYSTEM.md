# Lead Capture System Documentation

## Overview

The Lead Capture System enables real-time collection of lead form submissions from Meta (Facebook/Instagram) Lead Ads campaigns. When a user submits a lead form in your ad, the system automatically captures their contact information and stores it in the database.

## Architecture

```
Meta Ad (Lead Form)
        ↓
User Submits Form
        ↓
Meta Webhook → /api/webhooks/meta (POST)
        ↓
Fetch Lead Data from Meta API
        ↓
Store in lead_submissions table
        ↓
Notify Organization Owner
        ↓
Display in UI (LeadsList component)
```

## How It Works

### 1. Webhook Flow

When a user completes a lead form in your Meta ad:

1. **Meta sends webhook** to `https://yourdomain.com/api/webhooks/meta`
2. **Webhook payload** contains:
   ```json
   {
     "field": "leadgen",
     "value": {
       "leadgen_id": "1234567890",
       "form_id": "form_123",
       "ad_id": "ad_456",
       "adgroup_id": "adset_789",
       "page_id": "page_101112",
       "created_time": 1234567890
     }
   }
   ```

3. **Webhook handler** ([route.ts:242](../src/app/api/webhooks/meta/route.ts#L242)):
   - Extracts `leadgen_id` from webhook
   - Finds campaign via `ad_id`
   - Retrieves access token
   - Calls Meta API to fetch full lead data
   - Stores in `lead_submissions` table
   - Sends in-app notification to org owner

### 2. Database Schema

**Table:** `lead_submissions`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `leadgen_id` | TEXT | Meta's unique lead ID (unique constraint) |
| `form_id` | TEXT | Meta Lead Gen Form ID |
| `ad_id` | TEXT | Meta ad ID that generated the lead |
| `campaign_id` | UUID | References campaigns table |
| `organization_id` | UUID | Multi-org scoping |
| `field_data` | JSONB | Array of form responses: `[{name, values[]}]` |
| `submitted_at` | TIMESTAMPTZ | When user submitted (from Meta) |
| `created_at` | TIMESTAMPTZ | When we captured it |

**Example `field_data` structure:**
```json
[
  {"name": "full_name", "values": ["John Doe"]},
  {"name": "email", "values": ["john@example.com"]},
  {"name": "phone_number", "values": ["+2348012345678"]},
  {"name": "company", "values": ["Acme Inc"]}
]
```

### 3. Meta API Integration

**Method:** `MetaService.getLeadData()` ([meta.ts:530](../src/lib/api/meta.ts#L530))

Fetches full lead data from Meta Graph API:
```typescript
GET /{leadgen_id}?fields=id,created_time,field_data
```

**Required Permission:** `leads_retrieval` (already configured)

**Response:**
```json
{
  "id": "1234567890",
  "created_time": "2025-03-26T10:30:00+0000",
  "field_data": [
    {"name": "email", "values": ["user@example.com"]},
    {"name": "full_name", "values": ["Jane Smith"]}
  ]
}
```

## Multi-Org Compliance

✅ **Organization Scoping:**
- Webhook identifies org via: `ad_id` → `ads.campaign_id` → `campaigns.organization_id`
- RLS policies ensure users only see leads from their organizations
- Server actions use `getActiveOrgId()` and filter by `organization_id`

✅ **Access Control:**
- `SELECT`: Users can view leads from orgs they belong to
- `INSERT`: Service role only (webhook handler)
- `UPDATE/DELETE`: Users can manage leads from their orgs (e.g., GDPR deletion)

## Server Actions

Located in [src/actions/leads.ts](../src/actions/leads.ts)

### `fetchCampaignLeads(campaignId)`
Returns all leads for a specific campaign (org-scoped).

### `fetchOrganizationLeads(limit = 100)`
Returns all leads across all campaigns for the active org.

### `getCampaignLeadStats(campaignId)`
Returns lead count statistics:
```typescript
{
  total: number;
  last24Hours: number;
  last7Days: number;
  last30Days: number;
}
```

### `exportCampaignLeadsToCSV(campaignId)`
Exports leads to CSV format with all form fields as columns.

### `deleteLeadSubmission(leadId)`
Deletes a lead (GDPR compliance).

## UI Component

**Component:** `LeadsList` ([leads-list.tsx](../src/components/campaigns/leads-list.tsx))

**Features:**
- Real-time lead stats (24h, 7d, 30d, total)
- Sortable table with contact info (name, email, phone)
- Export to CSV
- Delete individual leads
- Click-to-email and click-to-call links
- Responsive design

**Usage:**
```tsx
import { LeadsList } from "@/components/campaigns/leads-list";

<LeadsList campaignId="campaign_uuid" />
```

## Webhook Configuration

### Prerequisites
1. ✅ Meta App with `leads_retrieval` permission
2. ✅ Webhook endpoint: `https://yourdomain.com/api/webhooks/meta`
3. ✅ Verify token: Set in `META_WEBHOOK_VERIFY_TOKEN` env var
4. ✅ App secret: Set in `META_APP_SECRET` env var

### Subscribe to `leadgen` Field

In your Meta App Dashboard:
1. Go to **Webhooks** → **Page** subscriptions
2. Subscribe to the **`leadgen`** field
3. Select your Pages
4. Ensure webhook verification succeeds

### Testing Webhooks

Use Meta's Graph API Explorer to send test events:
```bash
curl -X POST "https://graph.facebook.com/v25.0/me/subscriptions" \
  -d "object=page" \
  -d "callback_url=https://yourdomain.com/api/webhooks/meta" \
  -d "fields=leadgen" \
  -d "verify_token=YOUR_VERIFY_TOKEN" \
  -d "access_token=YOUR_ACCESS_TOKEN"
```

## Data Privacy & GDPR

### PII Storage
- Lead data (names, emails, phone numbers) is stored in Postgres
- **Current:** No encryption at rest (Phase 1)
- **Future:** Consider encrypting `field_data` column (Phase 2)

### GDPR Compliance
- ✅ Users can delete leads via `deleteLeadSubmission()`
- ✅ Export functionality for data portability
- ⚠️ **Important:** Include privacy policy URL when creating lead forms

### Retention Policy
- No automatic deletion (you must implement if required by law)
- Recommend: Add `archived_at` column and soft-delete old leads

## Troubleshooting

### Leads Not Appearing
1. **Check webhook logs:**
   ```bash
   # Supabase dashboard → Edge Functions → Logs
   # Look for "📋 Lead Form Submission" messages
   ```

2. **Verify webhook subscription:**
   - Meta App Dashboard → Webhooks → Page subscriptions
   - Ensure `leadgen` field is checked

3. **Check RLS policies:**
   ```sql
   SELECT * FROM lead_submissions WHERE organization_id = 'your_org_id';
   ```

4. **Verify ad_id mapping:**
   - Webhook sends `ad_id` from Meta
   - Must exist in `ads` table with `platform_ad_id`

### Permission Errors
If you get "Permission denied" when fetching leads:
```sql
-- Check if leads_retrieval permission is granted
SELECT * FROM ad_accounts WHERE platform_account_id = 'act_123';
-- Verify access_token is valid and has leads_retrieval scope
```

### Duplicate Leads
- The `leadgen_id` column has a `UNIQUE` constraint
- Duplicate webhook events will fail silently (by design)
- Check logs for "UNIQUE constraint violation" errors

## Performance

### Indexes
All critical queries are indexed:
- `leadgen_id` (unique lookups)
- `campaign_id` (fetch leads for campaign)
- `organization_id` (multi-org filtering)
- `submitted_at` (time-based queries)
- `field_data` (JSONB GIN index for field searches)

### Expected Load
- Webhook handler: <200ms response time
- Lead list query: <100ms (with proper indexes)
- CSV export: ~1s for 1000 leads

## Future Enhancements

- [ ] Real-time UI updates via Supabase Realtime
- [ ] CRM integration (Salesforce, HubSpot)
- [ ] Email autoresponder for new leads
- [ ] Lead scoring based on form responses
- [ ] Encryption at rest for PII
- [ ] Automated follow-up workflows
- [ ] Lead assignment to team members

## Related Files

| File | Purpose |
|------|---------|
| [supabase/migrations/20260326000001_lead_submissions_table.sql](../supabase/migrations/20260326000001_lead_submissions_table.sql) | Database schema |
| [src/app/api/webhooks/meta/route.ts](../src/app/api/webhooks/meta/route.ts#L242) | Webhook handler |
| [src/lib/api/meta.ts](../src/lib/api/meta.ts#L530) | Meta API client |
| [src/actions/leads.ts](../src/actions/leads.ts) | Server actions |
| [src/components/campaigns/leads-list.tsx](../src/components/campaigns/leads-list.tsx) | UI component |
| [.agent/skills/lead-gen-objective/SKILL.md](../.agent/skills/lead-gen-objective/SKILL.md) | Lead gen objective skill |

## Support

For issues or questions:
1. Check [Meta Lead Ads Webhooks Documentation](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/webhooks-for-leadgen/)
2. Review webhook logs in Supabase dashboard
3. Verify Meta App permissions in App Dashboard
4. Consult this documentation for architecture details
