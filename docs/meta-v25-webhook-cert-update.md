# Meta Webhooks mTLS Certificate Update

## 🚨 URGENT: March 31, 2026 Deadline

Meta is updating the SSL/TLS certificates used for webhook delivery. **All webhook endpoints must trust the new certificates by March 31, 2026**, or webhook delivery will fail.

## What You Need to Do

### 1. Verify Current Webhook Configuration

Your Meta webhook endpoint is:
```
https://your-domain.com/api/webhooks/meta
```

Handler location: [`src/app/api/webhooks/meta/route.ts`](../src/app/api/webhooks/meta/route.ts)

### 2. Certificate Trust Store Update

**For Vercel/Next.js deployments:**
- Vercel automatically updates Node.js runtime certificates
- **Action**: Verify your deployment is using Node.js 18+ (which includes Mozilla's CA bundle)
- **Check**: Run `node --version` in your deployment environment

**For self-hosted deployments:**
- Update system CA certificates: `sudo apt-get update && sudo apt-get install ca-certificates`
- Restart your Node.js server after certificate update

### 3. Test Webhook Delivery

Before March 31, test webhook delivery from Meta:

1. **Via Meta Events Manager:**
   - Go to https://developers.facebook.com/apps/YOUR_APP_ID/webhooks/
   - Click "Test" next to your webhook subscription
   - Verify successful delivery in your logs

2. **Monitor Logs:**
   ```bash
   # Check for SSL/TLS errors in your application logs
   grep -i "certificate\|ssl\|tls" /var/log/your-app.log
   ```

3. **Expected Behavior:**
   - ✅ Webhook request received
   - ✅ Signature validation passed
   - ✅ Event processed successfully

### 4. Track Webhook Status in Database

We've added tracking for this update in the `ad_accounts` table:

```sql
-- Mark account webhooks as updated
UPDATE ad_accounts
SET webhook_cert_updated = true
WHERE platform_account_id = 'YOUR_ACCOUNT_ID';
```

## What's Changing?

Meta is issuing new TLS certificates for their webhook delivery infrastructure. The change affects:

- Certificate Authority (CA)
- Certificate chain
- SSL/TLS handshake validation

**No code changes required** - this is purely an infrastructure/certificate trust update.

## Failure Symptoms (if not updated by March 31)

If your system doesn't trust the new certificates, you'll see:

```
Error: unable to verify the first certificate
Error: certificate has expired
Error: self signed certificate in certificate chain
```

Webhooks will fail to deliver, meaning you'll miss:
- Campaign status updates
- Ad rejection notifications
- Payment failure alerts
- Account health changes

## Testing Checklist

- [ ] Verify Node.js version is 18+ (or runtime has updated CA bundle)
- [ ] Test webhook delivery from Meta Events Manager
- [ ] Monitor logs for SSL/TLS errors
- [ ] Confirm signature validation still works
- [ ] Update `webhook_cert_updated` flag in database

## References

- [Meta Marketing API v25.0 Changelog](https://developers.facebook.com/docs/marketing-api/marketing-api-changelog/version25.0/)
- [Meta Webhooks Documentation](https://developers.facebook.com/docs/graph-api/webhooks/)
- [Node.js TLS Documentation](https://nodejs.org/api/tls.html)

## Support

If webhook delivery fails after March 31:
1. Check deployment platform (Vercel) certificate updates
2. Verify firewall isn't blocking new certificate chain
3. Contact Meta Developer Support with webhook trace ID
