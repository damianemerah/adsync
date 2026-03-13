import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  const { data, error } = await supabase
    .from("organization_members")
    .select(
      "organization_id, organizations(subscription_tier, subscription_status, subscription_expires_at)"
    )
    .limit(1);
    
  console.log(JSON.stringify(data, null, 2))
}
run()
