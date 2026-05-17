-- Add missing columns to creative_templates table
-- type: 'preset' or 'template'
-- preferred_model: 'nano-banana', 'flux', or 'auto'
-- sort_order: integer for custom sorting
-- tags: text array for easier searching/filtering

ALTER TABLE creative_templates
  ADD COLUMN type text NOT NULL DEFAULT 'template',
  ADD COLUMN preferred_model text NOT NULL DEFAULT 'auto',
  ADD COLUMN sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN tags text[] NOT NULL DEFAULT '{}';

-- Add check constraints to enforce valid values
ALTER TABLE creative_templates
  ADD CONSTRAINT creative_templates_type_check CHECK (type IN ('preset', 'template')),
  ADD CONSTRAINT creative_templates_model_check CHECK (preferred_model IN ('nano-banana', 'flux', 'auto'));

-- Add indexes for columns that might be used in sorting or filtering
CREATE INDEX idx_creative_templates_type ON creative_templates(type);
CREATE INDEX idx_creative_templates_sort_order ON creative_templates(sort_order);
CREATE INDEX idx_creative_templates_tags ON creative_templates USING GIN (tags);
