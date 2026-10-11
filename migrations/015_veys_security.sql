-- Allow owner/developer zero-VEYS test purchases while preventing public free purchases.
ALTER TABLE veys_purchases DROP CONSTRAINT IF EXISTS veys_purchases_cost_check;
ALTER TABLE veys_purchases ADD CONSTRAINT veys_purchases_cost_check CHECK(cost>=0);
-- Supabase public roles must never read or mutate monetary balances.
ALTER TABLE veys_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE veys_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE veys_purchases ENABLE ROW LEVEL SECURITY;
