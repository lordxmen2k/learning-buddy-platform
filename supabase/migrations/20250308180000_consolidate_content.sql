/*
  # Consolidate Content Tables

  1. Changes
    - Create new consolidated_content table
    - Migrate data from generated_content and predefined_content
    - Update references in user_courses
    - Drop old tables
  
  2. Security
    - Maintain existing RLS policies
    - Update foreign key references
*/

-- Create new consolidated table
CREATE TABLE IF NOT EXISTS consolidated_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash text UNIQUE NOT NULL,
  content text NOT NULL,
  user_message text NOT NULL,
  prompts jsonb,
  model text,
  topics text[] DEFAULT '{}',
  programming_languages text[] DEFAULT '{}',
  frameworks text[] DEFAULT '{}',
  level text,
  learning_style text,
  lesson_code uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_consolidated_content_hash ON consolidated_content(content_hash);
CREATE INDEX IF NOT EXISTS idx_consolidated_topics ON consolidated_content USING gin(topics);
CREATE INDEX IF NOT EXISTS idx_consolidated_programming_languages ON consolidated_content USING gin(programming_languages);
CREATE INDEX IF NOT EXISTS idx_consolidated_frameworks ON consolidated_content USING gin(frameworks);
CREATE INDEX IF NOT EXISTS idx_consolidated_level ON consolidated_content(level);
CREATE INDEX IF NOT EXISTS idx_consolidated_learning_style ON consolidated_content(learning_style);

-- Enable RLS
ALTER TABLE consolidated_content ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Anyone can read consolidated content"
  ON consolidated_content
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can insert consolidated content"
  ON consolidated_content
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Migrate data from old tables to new table
INSERT INTO consolidated_content (
  content_hash,
  content,
  user_message,
  prompts,
  model,
  topics,
  programming_languages,
  frameworks,
  level,
  learning_style,
  lesson_code,
  created_at
)
SELECT 
  g.content_hash,
  g.content,
  g.user_message,
  g.prompts,
  g.model,
  p.topics,
  p.programming_languages,
  p.frameworks,
  p.level,
  p.learning_style,
  g.lesson_code,
  g.timestamp
FROM generated_content g
LEFT JOIN predefined_content p ON g.content_hash = p.content_hash;

-- Update user_courses foreign key
ALTER TABLE user_courses 
  DROP CONSTRAINT IF EXISTS user_courses_content_hash_fkey,
  ADD CONSTRAINT user_courses_content_hash_fkey 
    FOREIGN KEY (content_hash) 
    REFERENCES consolidated_content(content_hash) 
    ON DELETE CASCADE;

-- Drop old tables
DROP TABLE IF EXISTS predefined_content;
DROP TABLE IF EXISTS generated_content;