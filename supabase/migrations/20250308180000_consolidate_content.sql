-- Create new consolidated table
CREATE TABLE IF NOT EXISTS public.consolidated_content (
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
CREATE INDEX IF NOT EXISTS idx_consolidated_content_hash ON public.consolidated_content(content_hash);
CREATE INDEX IF NOT EXISTS idx_consolidated_topics ON public.consolidated_content USING gin(topics);
CREATE INDEX IF NOT EXISTS idx_consolidated_programming_languages ON public.consolidated_content USING gin(programming_languages);
CREATE INDEX IF NOT EXISTS idx_consolidated_frameworks ON public.consolidated_content USING gin(frameworks);
CREATE INDEX IF NOT EXISTS idx_consolidated_level ON public.consolidated_content(level);
CREATE INDEX IF NOT EXISTS idx_consolidated_learning_style ON public.consolidated_content(learning_style);

-- Enable RLS
ALTER TABLE public.consolidated_content ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Anyone can read consolidated content"
  ON public.consolidated_content
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can insert consolidated content"
  ON public.consolidated_content
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Migrate data from old tables to new table
INSERT INTO public.consolidated_content (
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
FROM public.generated_content g
LEFT JOIN public.predefined_content p ON g.content_hash = p.content_hash;

-- Drop old tables
DROP TABLE IF EXISTS public.predefined_content;
DROP TABLE IF EXISTS public.generated_content;