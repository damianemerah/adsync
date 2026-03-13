/**
 * Sudo Africa Virtual Card Integration
 *
 * Official API for issuing virtual USD cards for Meta ad payments
 * Each organization gets ONE virtual card linked to their Meta ad account
 *
 * Documentation: https://docs.sudo.africa
 * API Reference: https://docs.sudo.africa/reference
 * Dashboard: https://app.sudo.africa
 *
 * SETUP INSTRUCTIONS:
 * 1. Sign up at https://app.sudo.africa (sandbox or production)
 * 2. Get API credentials from dashboard
 * 3. Add to .env:
 *    SUDO_API_KEY=your_api_key
 *    SUDO_BASE_URL=https://api.sudo.africa/v1 (or sandbox URL)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Environment configuration
// ─────────────────────────────────────────────────────────────────────────────
const SUDO_API_KEY = process.env.SUDO_API_KEY;
const SUDO_BASE_URL = process.env.SUDO_BASE_URL || "https://api.sandbox.sudo.africa/v1";

// ─────────────────────────────────────────────────────────────────────────────
// Type definitions
// ─────────────────────────────────────────────────────────────────────────────

export interface SudoCustomer {
  id: string;
  type: "individual" | "business";
  name: string;
  status: "active" | "inactive";
  emailAddress: string;
  phoneNumber: string;
  individual?: {
    firstName: string;
    lastName: string;
    dob: string; // YYYY-MM-DD
    identity?: {
      type: "BVN" | "NIN" | "PASSPORT";
      number: string;
    };
  };
  billingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string; // ISO 3166-1 alpha-2 (e.g., "NG")
  };
  createdAt: string;
}

export interface SudoAccount {
  id: string;
  customerId: string;
  type: "wallet" | "settlement";
  currency: "NGN" | "USD";
  accountNumber?: string;
  bankCode?: string;
  balance: number;
  status: "active" | "inactive" | "frozen";
  createdAt: string;
}

export interface SudoCard {
  id: string;
  customerId: string;
  accountId: string;
  type: "virtual" | "physical";
  brand: "VISA" | "MASTERCARD";
  currency: "NGN" | "USD";
  status: "active" | "inactive" | "frozen" | "blocked";
  maskedPan: string; // e.g., "5399••••••••1234"
  last4: string;
  expiryMonth: string;
  expiryYear: string;
  cardHolderName: string;
  billingAddress: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  spendingControls?: {
    spendingLimits?: {
      amount: number;
      interval: "daily" | "weekly" | "monthly" | "lifetime";
    }[];
    allowedCategories?: string[]; // MCC codes
    blockedCategories?: string[];
    allowedMerchants?: string[];
    blockedMerchants?: string[];
    channels?: {
      atm?: boolean;
      pos?: boolean;
      web?: boolean;
      mobile?: boolean;
      contactless?: boolean;
    };
  };
  createdAt: string;
}

export interface SudoCardDetails extends SudoCard {
  pan: string; // Full card number (only returned on creation or reveal)
  cvv: string;
  pin?: string;
}

export interface SudoFundingSource {
  id: string;
  customerId: string;
  type: "bank_account" | "card" | "wallet";
  currency: "NGN" | "USD";
  accountNumber?: string;
  bankCode?: string;
  status: "active" | "inactive";
  createdAt: string;
}

export interface SudoAuthorization {
  id: string;
  cardId: string;
  amount: number;
  currency: string;
  merchantName: string;
  merchantCategory: string;
  status: "approved" | "declined";
  declineReason?: string;
  createdAt: string;
}

export interface SudoTransaction {
  id: string;
  cardId: string;
  authorizationId: string;
  amount: number;
  currency: string;
  merchantName: string;
  merchantCategory: string;
  status: "pending" | "completed" | "failed" | "reversed";
  type: "purchase" | "refund" | "reversal";
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Make authenticated API request to Sudo
// ─────────────────────────────────────────────────────────────────────────────
async function sudoRequest<T>(
  endpoint: string,
  method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
  body?: any,
): Promise<T> {
  if (!SUDO_API_KEY) {
    throw new Error(
      "Sudo Africa API credentials not configured. Set SUDO_API_KEY in .env",
    );
  }

  const url = `${SUDO_BASE_URL}${endpoint}`;

  console.log(`[Sudo API] ${method} ${endpoint}`);

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUDO_API_KEY}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("Sudo API error:", response.status, errorData);
    throw new Error(
      errorData.message ||
        `Sudo API request failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  return data.data || data; // Sudo may wrap response in {data: ...}
}

// ─────────────────────────────────────────────────────────────────────────────
// Create a customer (cardholder)
// This should be called once per organization when they first sign up
// ─────────────────────────────────────────────────────────────────────────────
export async function createCustomer(
  organizationId: string,
  organizationName: string,
  email: string,
  phone: string,
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
  },
): Promise<SudoCustomer> {
  console.log(`Creating Sudo customer for org ${organizationId}`);

  const customer = await sudoRequest<SudoCustomer>("/customers", "POST", {
    type: "business",
    name: organizationName,
    status: "active",
    emailAddress: email,
    phoneNumber: phone,
    billingAddress: {
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: "NG", // Nigeria
    },
  });

  console.log(`✅ Created Sudo customer ${customer.id} for org ${organizationId}`);

  return customer;
}

// ─────────────────────────────────────────────────────────────────────────────
// Create a USD settlement account
// This is where funds are held before being loaded onto the card
// ─────────────────────────────────────────────────────────────────────────────
export async function createUsdAccount(customerId: string): Promise<SudoAccount> {
  console.log(`Creating USD settlement account for customer ${customerId}`);

  const account = await sudoRequest<SudoAccount>("/accounts", "POST", {
    customerId,
    type: "settlement",
    currency: "USD",
  });

  console.log(`✅ Created USD account ${account.id} for customer ${customerId}`);

  return account;
}

// ─────────────────────────────────────────────────────────────────────────────
// Create a virtual USD card
// ─────────────────────────────────────────────────────────────────────────────
export async function createVirtualCard(
  customerId: string,
  accountId: string,
  cardHolderName: string,
  billingAddress: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
  },
): Promise<SudoCardDetails> {
  console.log(`Creating virtual USD card for customer ${customerId}`);

  const card = await sudoRequest<SudoCardDetails>("/cards/cards", "POST", {
    customerId,
    accountId,
    type: "virtual",
    currency: "USD",
    brand: "VISA", // or "MASTERCARD"
    status: "active",
    cardHolderName,
    billingAddress: {
      line1: billingAddress.line1,
      city: billingAddress.city,
      state: billingAddress.state,
      postalCode: billingAddress.postalCode,
      country: "NG",
    },
    spendingControls: {
      channels: {
        atm: false, // Disable ATM withdrawals
        pos: false, // Disable POS transactions
        web: true, // Enable web payments (Meta ads)
        mobile: true, // Enable mobile app payments
        contactless: false,
      },
      allowedCategories: [
        "5817", // MCC for Digital Goods/Software
        "7311", // MCC for Advertising Services
        "7372", // MCC for Computer Programming/Data Processing
      ],
    },
  });

  console.log(
    `✅ Created virtual USD card ${card.id} (ending in ${card.last4}) for customer ${customerId}`,
  );

  // IMPORTANT: Full card details (pan, cvv) are only returned on creation
  // Store these securely (encrypted) or don't store at all
  return card;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fund a USD account (convert NGN → USD)
// This transfers funds from the organization's Naira wallet to their USD account
// ─────────────────────────────────────────────────────────────────────────────
export async function fundUsdAccount(
  accountId: string,
  amountNgn: number, // Amount in Naira (NOT kobo)
): Promise<{
  transactionId: string;
  amountNgn: number;
  amountUsd: number;
  fxRate: number;
  status: "success" | "pending" | "failed";
}> {
  console.log(`Funding USD account ${accountId} with ₦${amountNgn.toLocaleString()}`);

  // Note: The actual endpoint for funding may vary
  // This is based on typical card issuing platform patterns
  // Verify with Sudo documentation: https://docs.sudo.africa/reference
  const response = await sudoRequest<any>(`/accounts/${accountId}/fund`, "POST", {
    amount: amountNgn,
    currency: "NGN",
    destinationCurrency: "USD",
  });

  console.log(
    `✅ Funded account ${accountId}: ₦${response.amountNgn} → $${response.amountUsd} (rate: ${response.fxRate})`,
  );

  return {
    transactionId: response.id || response.transactionId,
    amountNgn: response.amountNgn || amountNgn,
    amountUsd: response.amountUsd || response.amount,
    fxRate: response.fxRate || response.exchangeRate,
    status: response.status || "success",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Get card details (balance, status, etc.)
// ─────────────────────────────────────────────────────────────────────────────
export async function getCardDetails(cardId: string): Promise<SudoCard> {
  return sudoRequest<SudoCard>(`/cards/cards/${cardId}`, "GET");
}

// ─────────────────────────────────────────────────────────────────────────────
// Get account balance
// ─────────────────────────────────────────────────────────────────────────────
export async function getAccountBalance(accountId: string): Promise<{
  balance: number;
  currency: string;
}> {
  const account = await sudoRequest<SudoAccount>(`/accounts/${accountId}`, "GET");
  return {
    balance: account.balance,
    currency: account.currency,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Freeze a card (e.g., if org subscription is canceled or policy violation)
// ─────────────────────────────────────────────────────────────────────────────
export async function freezeCard(cardId: string): Promise<void> {
  console.log(`Freezing Sudo card ${cardId}`);

  await sudoRequest(`/cards/cards/${cardId}`, "PATCH", {
    status: "frozen",
  });

  console.log(`✅ Frozen card ${cardId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Unfreeze a card
// ─────────────────────────────────────────────────────────────────────────────
export async function unfreezeCard(cardId: string): Promise<void> {
  console.log(`Unfreezing Sudo card ${cardId}`);

  await sudoRequest(`/cards/cards/${cardId}`, "PATCH", {
    status: "active",
  });

  console.log(`✅ Unfrozen card ${cardId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Block a card (permanent, cannot be reversed)
// ─────────────────────────────────────────────────────────────────────────────
export async function blockCard(cardId: string): Promise<void> {
  console.log(`Blocking Sudo card ${cardId}`);

  await sudoRequest(`/cards/cards/${cardId}`, "PATCH", {
    status: "blocked",
  });

  console.log(`✅ Blocked card ${cardId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Get card transactions
// ─────────────────────────────────────────────────────────────────────────────
export async function getCardTransactions(
  cardId: string,
  limit = 50,
): Promise<SudoTransaction[]> {
  const response = await sudoRequest<{ transactions: SudoTransaction[] }>(
    `/cards/cards/${cardId}/transactions?limit=${limit}`,
    "GET",
  );
  return response.transactions || [];
}

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATION NOTES FOR PRODUCTION
// ─────────────────────────────────────────────────────────────────────────────
/*

BEFORE GOING LIVE:

1. SIGN UP FOR SUDO AFRICA
   - Sandbox: https://app.sudo.africa (for testing)
   - Production: Contact Sudo for production access
   - Complete KYC/business verification

2. UPDATE .env FILE
   Add these environment variables:
   ```
   SUDO_API_KEY=your_api_key_here
   SUDO_BASE_URL=https://api.sudo.africa/v1  # or sandbox URL
   ```

3. VERIFY API ENDPOINTS
   Some endpoints may vary from this implementation.
   Check latest docs at: https://docs.sudo.africa/reference
   Key endpoints to verify:
   - POST /customers (create customer)
   - POST /accounts (create USD account)
   - POST /cards/cards (create card)
   - POST /accounts/:id/fund (fund USD account)
   - GET /cards/cards/:id (get card details)
   - PATCH /cards/cards/:id (update card status)
   - GET /cards/cards/:id/transactions (get transactions)

4. IMPLEMENT WEBHOOK HANDLER
   Sudo sends webhooks for:
   - card.created
   - card.transaction.authorized
   - card.transaction.completed
   - card.transaction.declined
   - account.funded
   - card.frozen
   - card.blocked

   Create: src/app/api/webhooks/sudo/route.ts
   Verify webhook signatures to prevent spoofing

5. SECURITY: NEVER STORE FULL CARD DETAILS
   The full PAN and CVV are only returned on card creation.

   Options:
   A) Don't store them - fetch on-demand when user needs them
   B) Store encrypted using Supabase Vault
   C) Show once on creation, then user must request reveal

   Recommended: Option A (don't store)

6. META BUSINESS MANAGER INTEGRATION
   After creating a card, you need to:

   a) Provide card details to user securely
   b) Guide user to add card to Meta Business Manager
   c) User sets card as default payment method
   d) Store meta_account_id in virtual_cards table

   This may be manual (user copies card details) or automated
   via Meta Business API (requires additional integration)

7. TESTING CHECKLIST
   - [ ] Create customer in Sudo sandbox
   - [ ] Create USD account for customer
   - [ ] Create virtual USD card
   - [ ] Fund account with test Naira
   - [ ] Verify USD balance updates
   - [ ] Test card on Meta Ads Manager (sandbox if available)
   - [ ] Verify webhook delivery
   - [ ] Test freeze/unfreeze flow
   - [ ] Test transaction history
   - [ ] Test error handling (insufficient balance, declined transactions)

8. COMPLIANCE & KYC
   - Sudo handles most compliance
   - You need to collect: name, email, phone, address, BVN/NIN
   - Implement KYC collection in onboarding flow
   - Sudo may require business verification documents

9. FX RATE TRANSPARENCY
   Always show users:
   - NGN amount charged
   - USD amount loaded
   - Exchange rate used
   - Any fees (Paystack + Sudo)

   Example:
   ```
   ₦50,000 → $32.15 USD
   Rate: ₦1,555/USD
   Paystack fee: ₦750 (1.5%)
   Sudo fee: Included in rate
   ```

10. MONITORING & ALERTS
    Set up monitoring for:
    - Failed card creations
    - Failed funding attempts
    - Unusual FX rate fluctuations
    - High decline rates
    - Card suspensions by Sudo
    - Webhook delivery failures

11. ERROR HANDLING
    Common errors to handle:
    - Insufficient balance
    - Card blocked by Sudo
    - Transaction declined by merchant
    - Invalid card details
    - KYC verification failed
    - Rate limit exceeded

12. RATE LIMITS
    Check Sudo docs for rate limits on:
    - Card creation (likely limited per day/month)
    - API calls
    - Funding operations

    Implement retry logic with exponential backoff

*/
