const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
supabase.from('organization_members').select('organization_id, organizations(subscription_tier)').limit(1).then(({data}) => require('fs').writeFileSync('test-out.json', JSON.stringify(data, null, 2)));
