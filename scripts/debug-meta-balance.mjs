import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iomvjxlfxeppizkhehcl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';
const KEY_BUF = Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32));

function decrypt(text) {
  const parts = text.split(':');

  // v1/v2 → AES-256-CBC  format: "v2:IV_HEX:CIPHER_HEX"
  if (parts[0] === 'v1' || parts[0] === 'v2') {
    const iv = Buffer.from(parts[1], 'hex');
    const encryptedText = Buffer.from(parts[2], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', KEY_BUF, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }

  // AES-256-GCM (written by edge functions)  format: "IV_HEX:AUTHTAG_HEX:CIPHER_HEX"
  if (parts.length === 3 && !parts[0].startsWith('v')) {
    const iv = Buffer.from(parts[0], 'hex');           // 12 bytes → 24 hex chars
    const authTag = Buffer.from(parts[1], 'hex');      // 16 bytes → 32 hex chars
    const ciphertext = Buffer.from(parts[2], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY_BUF, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }

  // Legacy 2-part: "IV:ENCRYPTED"
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = Buffer.from(parts[1], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', KEY_BUF, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const { data: accounts, error } = await supabase
  .from('ad_accounts')
  .select('id, platform_account_id, access_token, health_status')
  .is('disconnected_at', null)
  .not('access_token', 'is', null);

if (error) { console.error('DB error:', error); process.exit(1); }

console.log(`\n🔍 Found ${accounts.length} accounts\n`);

for (const account of accounts) {
  const actId = account.platform_account_id.startsWith('act_')
    ? account.platform_account_id
    : `act_${account.platform_account_id}`;

  let accessToken;
  try {
    accessToken = decrypt(account.access_token);
    console.log(`✅ Token decrypted OK for ${actId} (starts with: ${accessToken.slice(0, 10)}...)`);
  } catch (e) {
    console.error(`❌ Token decrypt failed for ${actId}:`, e.message);
    continue;
  }

  // Try multiple field combinations
  const fieldSets = [
    'balance,currency,account_status',
    'balance,currency,account_status,amount_spent,spend_cap',
    'balance,currency,account_status,funding_source_details',
  ];

  const url = `https://graph.facebook.com/v25.0/${actId}?fields=${fieldSets[1]}&access_token=${accessToken}`;
  console.log(`\n📡 Calling Meta for ${actId}...`);

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      console.error(`❌ Meta API error for ${actId}:`, JSON.stringify(data.error, null, 2));
    } else {
      console.log(`\n📊 RAW Meta response for ${actId}:`);
      console.log(JSON.stringify(data, null, 2));
      console.log(`\n💰 balance raw value: "${data.balance}" (type: ${typeof data.balance})`);
      console.log(`   parseInt result:    ${parseInt(data.balance, 10)}`);
      console.log(`   parseFloat result:  ${parseFloat(data.balance)}`);
      console.log(`   Number() result:    ${Number(data.balance)}`);
    }
  } catch (e) {
    console.error(`❌ Fetch error for ${actId}:`, e.message);
  }

  console.log('\n' + '─'.repeat(60));
}
