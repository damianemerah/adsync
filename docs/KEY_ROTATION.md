# Encryption Key Rotation Guide

## Overview

Access tokens and sensitive data in Tenzu are encrypted using AES-256-CBC. This guide explains how to rotate the encryption key safely without breaking existing encrypted data.

## Current Implementation

- **Primary Key**: `ENCRYPTION_KEY` (env var) - used for all new encryptions
- **Legacy Key**: `ENCRYPTION_KEY_V1` (env var) - optional, for decrypting old data
- **Format**: `v2:IV_HEX:ENCRYPTED_HEX` (v2 = current version)

## When to Rotate

Rotate the encryption key if:
1. The key is suspected to be compromised
2. A developer with key access leaves the team
3. As part of regular security hygiene (every 12-24 months)
4. Regulatory compliance requires it

## Rotation Process

### Step 1: Generate New Key

```bash
# Generate a 32-character random hex string
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### Step 2: Update Environment Variables

```bash
# Move current key to legacy slot
ENCRYPTION_KEY_V1="<OLD_KEY_32_CHARS>"

# Set new key
ENCRYPTION_KEY="<NEW_KEY_32_CHARS>"
```

### Step 3: Update Key Version in Code

Edit `src/lib/crypto.ts`:

```typescript
const CURRENT_KEY_VERSION = 'v3' // Increment from v2 to v3
```

### Step 4: Deploy

Deploy the updated application. **Do NOT restart services yet.**

### Step 5: Re-encrypt Existing Data (Optional but Recommended)

Run the re-encryption script to migrate all encrypted data to the new key:

```bash
npm run reencrypt:tokens
```

This script:
1. Fetches all `ad_accounts` with encrypted `access_token`
2. Decrypts using old key (via `ENCRYPTION_KEY_V1`)
3. Re-encrypts using new key
4. Updates database

### Step 6: Verify

1. Test Meta API calls (token decryption works)
2. Check logs for decryption errors
3. Verify campaign sync still works

### Step 7: Remove Legacy Key (After 30 Days)

Once all data is re-encrypted and verified:
1. Remove `ENCRYPTION_KEY_V1` from environment
2. Remove legacy decryption fallback logic from `decrypt()` function

## Rollback Plan

If issues occur after rotation:
1. Swap `ENCRYPTION_KEY` and `ENCRYPTION_KEY_V1` values
2. Revert `CURRENT_KEY_VERSION` to previous value
3. Redeploy

## Security Best Practices

1. **Never commit keys to git** - use environment variables or secrets manager
2. **Restrict key access** - only deployment admins should see the key
3. **Audit key usage** - log when legacy key is used (indicates stale data)
4. **Use Supabase Vault (Enterprise)** - for automated key management

## Re-encryption Script

Create `scripts/reencrypt-tokens.ts`:

```typescript
import { createAdminClient } from "@/lib/supabase/server";
import { encrypt, decrypt } from "@/lib/crypto";

async function reencryptTokens() {
  const supabase = createAdminClient();

  const { data: accounts } = await supabase
    .from("ad_accounts")
    .select("id, access_token");

  if (!accounts) return;

  for (const account of accounts) {
    try {
      // Decrypt with old key (auto-detects version)
      const plaintext = decrypt(account.access_token);

      // Re-encrypt with new key
      const newEncrypted = encrypt(plaintext);

      // Update database
      await supabase
        .from("ad_accounts")
        .update({ access_token: newEncrypted })
        .eq("id", account.id);

      console.log(`✅ Re-encrypted token for account ${account.id}`);
    } catch (err) {
      console.error(`❌ Failed for account ${account.id}:`, err);
    }
  }

  console.log("Re-encryption complete!");
}

reencryptTokens();
```

## Monitoring

Add alerts for:
- High rate of decryption failures
- Legacy key usage after 30-day grace period
- ENCRYPTION_KEY env var changes

## References

- [OWASP Key Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html)
- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)
