-- Allow the anon role (used by the /l/[token] redirect route) to call
-- increment_campaign_clicks. The function is SECURITY DEFINER so it still
-- runs with elevated privileges — we're only granting the right to invoke it.
GRANT EXECUTE ON FUNCTION increment_campaign_clicks(UUID, TEXT) TO anon;
