-- Seed initial creative_templates rows for the Template-to-Image feature.
-- Mix of categories and tier gates. Thumbnails are nullable; gallery has a
-- visual fallback so the feature ships before hand-curated thumbnails are
-- uploaded to Supabase Storage.

INSERT INTO creative_templates
  (category, title, description, prompt_template, variables, negative_prompt, aspect_ratio, is_premium)
VALUES
  -- ── Product shots ─────────────────────────────────────────────────────────
  (
    'product_image',
    'Studio White',
    'Clean white-background product shot — perfect for catalog and e-commerce listings.',
    'Professional studio product photograph of a {argument name="product" default="product"}. Pure white seamless backdrop, soft diffused overhead lighting, subtle shadow beneath, ultra-sharp focus, photorealistic, high-end e-commerce styling.',
    '[
      {"key":"product","label":"Product Name","type":"text","placeholder":"e.g. Ankara handbag","required":true}
    ]'::jsonb,
    'text overlays, watermarks, busy backgrounds, distortion',
    '1:1',
    false
  ),
  (
    'product_image',
    'Lifestyle Flat Lay',
    'Top-down product shot styled with complementary props — great for social feed.',
    'Top-down flat lay photograph of a {argument name="product" default="product"} arranged with {argument name="props" default="natural complementary props"}. {argument name="surface" default="warm wooden"} surface, soft natural daylight from the upper left, organic styled composition, magazine-quality.',
    '[
      {"key":"product","label":"Product","type":"text","placeholder":"e.g. coffee tin","required":true},
      {"key":"props","label":"Surrounding Props","type":"text","placeholder":"e.g. coffee beans, ceramic cup"},
      {"key":"surface","label":"Surface","type":"select","options":["warm wooden","white marble","linen fabric","dark slate"],"default":"warm wooden"}
    ]'::jsonb,
    'people, hands, text overlays, harsh shadows',
    '1:1',
    false
  ),
  (
    'product_image',
    'Hero Spotlight',
    'Bold, dramatic product hero with editorial lighting — premium-feel campaigns.',
    'Editorial hero photograph of a {argument name="product" default="product"} with dramatic single-source rim lighting against a {argument name="backdrop" default="deep gradient"} backdrop. Cinematic depth of field, subtle reflections, color-graded with rich {argument name="brand_color" default="warm amber"} accent tones, ultra-detailed, premium ad campaign aesthetic.',
    '[
      {"key":"product","label":"Product","type":"text","required":true},
      {"key":"backdrop","label":"Backdrop","type":"select","options":["deep gradient","matte black","midnight navy","charcoal"],"default":"deep gradient"},
      {"key":"brand_color","label":"Accent Color","type":"color","default":"#E8A95B"}
    ]'::jsonb,
    'busy backgrounds, multiple products, text, watermarks',
    '4:5',
    true
  ),

  -- ── Social ads ────────────────────────────────────────────────────────────
  (
    'social_ad',
    'Instagram Story Promo',
    'Vertical promo with strong focal product and breathing room for copy overlay.',
    'Vertical Instagram Story composition featuring a {argument name="product" default="product"} prominently in the upper third, {argument name="background" default="soft pastel"} background with intentional negative space below for text overlay, modern minimalist styling, vibrant but balanced color palette.',
    '[
      {"key":"product","label":"Product or Offer","type":"text","required":true},
      {"key":"background","label":"Background Style","type":"select","options":["soft pastel","sunlit warm","tropical green","cool minimal","gradient sunset"],"default":"soft pastel"}
    ]'::jsonb,
    'cluttered composition, text in image, low contrast',
    '9:16',
    false
  ),
  (
    'social_ad',
    'Lifestyle In-Use',
    'Authentic user-generated-style shot of a person interacting with the product.',
    'Authentic candid photograph of a {argument name="audience" default="young Nigerian"} person genuinely using a {argument name="product" default="product"} in a {argument name="setting" default="bright sunlit Lagos cafe"}. Natural smartphone-style framing, warm honest lighting, joyful expression, social-media-native feel.',
    '[
      {"key":"product","label":"Product","type":"text","required":true},
      {"key":"audience","label":"Person Description","type":"text","placeholder":"e.g. young Nigerian woman"},
      {"key":"setting","label":"Setting","type":"text","placeholder":"e.g. bright Lagos cafe"}
    ]'::jsonb,
    'staged poses, fake smiles, studio lighting, watermarks',
    '4:5',
    true
  ),

  -- ── Posters ───────────────────────────────────────────────────────────────
  (
    'poster',
    'Bold Sale Poster',
    'High-impact graphic poster optimized for promotions and discount campaigns.',
    'Bold graphic poster design promoting {argument name="offer" default="a special offer"}. Strong typographic hierarchy with the headline as the dominant element, {argument name="vibe" default="vibrant high-energy"} color scheme, minimal supporting imagery, designed for fast eye-catching feed-stopping impact. Print-ready ad campaign quality.',
    '[
      {"key":"offer","label":"Offer or Headline","type":"text","placeholder":"e.g. 40% Off Weekend Sale","required":true},
      {"key":"vibe","label":"Visual Vibe","type":"select","options":["vibrant high-energy","luxury elegant","playful pastel","bold contrast"],"default":"vibrant high-energy"}
    ]'::jsonb,
    'busy patterns, photographic backgrounds, illegible text',
    '4:5',
    false
  );
