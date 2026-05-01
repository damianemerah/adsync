-- Repricing: lower base subscription prices and tighten credit allocations
-- to drive top-up revenue while keeping >80% gross margin at max usage.
-- Must mirror src/lib/constants.ts → PLAN_PRICES, PLAN_CREDITS.

UPDATE plan_definitions
SET price_ngn = 10000,
    credits_monthly = 50
WHERE plan_id = 'starter';

UPDATE plan_definitions
SET price_ngn = 25000,
    credits_monthly = 150
WHERE plan_id = 'growth';

UPDATE plan_definitions
SET price_ngn = 65000,
    credits_monthly = 250
WHERE plan_id = 'agency';
