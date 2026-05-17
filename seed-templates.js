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

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function parseContent(content) {
  let prompt_template = content;
  let negative_prompt = null;
  if (content.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(content);
      if (parsed.main_prompt) {
        prompt_template = parsed.main_prompt;
      }
      if (parsed.negative_prompt) {
        negative_prompt = parsed.negative_prompt;
      }
    } catch (e) {
      // Not a valid JSON, fallback to plain text
    }
  }
  return { prompt_template, negative_prompt };
}

function extractVariables(prompt_template) {
  const regex = /\{argument name="([^"]+)"(?: default="([^"]*)")?\}/g;
  let match;
  const variablesMap = new Map();
  
  while ((match = regex.exec(prompt_template)) !== null) {
    const key = match[1];
    const defaultValue = match[2] || '';
    if (!variablesMap.has(key)) {
      variablesMap.set(key, {
        key: key,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        type: 'text',
        default: defaultValue,
        required: false
      });
    }
  }
  
  return Array.from(variablesMap.values());
}

function extractAspectRatio(prompt_template) {
  const match = prompt_template.match(/\b(16:9|9:16|4:5|1:1|3:4|4:3)\b/);
  return match ? match[1] : '1:1';
}

function inferCategory(title, description) {
  const text = (title + " " + description).toLowerCase();
  if (text.includes('portrait') || text.includes('person') || text.includes('woman') || text.includes('man')) {
    return 'portrait';
  }
  if (text.includes('product') || text.includes('advertisement') || text.includes('ad') || text.includes('book')) {
    return 'product_ad';
  }
  if (text.includes('fashion') || text.includes('outfit') || text.includes('style') || text.includes('clothing')) {
    return 'fashion';
  }
  if (text.includes('header') || text.includes('banner') || text.includes('collage')) {
    return 'social_ad';
  }
  return 'general';
}

async function run() {
  console.log('Loading file...');
  const filePath = 'C:\\Users\\DEMIGOD\\Downloads\\product-marketing.json';
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`Loaded ${data.length} entries. Processing...`);

  const rowsToInsert = [];
  let skippedCount = 0;

  for (let i = 0; i < data.length; i++) {
    const entry = data[i];

    // 1 & 4. content -> prompt_template, negative_prompt
    let { prompt_template, negative_prompt } = parseContent(entry.content);

    if (!prompt_template || prompt_template.trim() === '') {
      console.log(`Skipped entry ${i}: Empty prompt_template`);
      skippedCount++;
      continue;
    }

    // 3. variables
    const variables = extractVariables(prompt_template);
    
    // 11. SKIP entries where needReferenceImages = true AND no {argument} variables
    if (entry.needReferenceImages === true && variables.length === 0) {
      console.log(`Skipped entry ${i}: needReferenceImages is true but no variables found`);
      skippedCount++;
      continue;
    }

    // 2. type
    const type = prompt_template.includes('{argument name=') ? 'template' : 'preset';

    // 5. aspect_ratio
    const aspect_ratio = extractAspectRatio(prompt_template);

    // 6. thumbnail_url
    const thumbnail_url = (entry.sourceMedia && entry.sourceMedia.length > 0) ? entry.sourceMedia[0] : null;

    // 7. category
    const category = inferCategory(entry.title || '', entry.description || '');

    rowsToInsert.push({
      title: entry.title || '',
      description: entry.description || '',
      prompt_template,
      variables, // Supabase JS will handle converting to jsonb
      negative_prompt,
      aspect_ratio,
      thumbnail_url,
      is_premium: false,
      category
    });
  }

  console.log(`Prepared ${rowsToInsert.length} valid entries. Skipped ${skippedCount}.`);

  // Select first 200, middle 200, last 200
  let subsetToInsert = rowsToInsert;
  if (rowsToInsert.length >= 600) {
    const first200 = rowsToInsert.slice(0, 200);
    const midIndex = Math.floor((rowsToInsert.length - 200) / 2);
    const middle200 = rowsToInsert.slice(midIndex, midIndex + 200);
    const last200 = rowsToInsert.slice(-200);
    subsetToInsert = [...first200, ...middle200, ...last200];
  }
  console.log(`Selected ${subsetToInsert.length} entries for insertion.`);

  // Insert in chunks of 50
  const chunkSize = 50;
  let insertedCount = 0;

  for (let i = 0; i < subsetToInsert.length; i += chunkSize) {
    const chunk = subsetToInsert.slice(i, i + chunkSize);
    const { data: result, error } = await supabase
      .from('creative_templates')
      .insert(chunk);

    if (error) {
      console.error(`Error inserting chunk ${i / chunkSize + 1}:`, error.message);
      process.exit(1);
    }
    
    insertedCount += chunk.length;
    console.log(`Inserted chunk ${i / chunkSize + 1} (${chunk.length} entries). Total inserted: ${insertedCount}`);
  }

  console.log('Finished seeding.');
}

run().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
