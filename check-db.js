const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf-8');
const envVars = envFile.split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if (key && value.length > 0) {
    acc[key.trim()] = value.join('=').trim().replace(/(^"|"$)/g, '');
  }
  return acc;
}, {});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function countRows() {
  const { count, error } = await supabase
    .from('creative_templates')
    .select('*', { count: 'exact', head: true });
    
  if (error) {
    console.error("Error counting:", error);
  } else {
    console.log("Total creative_templates count:", count);
  }
}

countRows();
