import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import chalk from 'chalk';

// Environment detection
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

// Environment-specific imports
let dotenv;
if (isNode) {
  dotenv = await import('dotenv');
  dotenv.config();
}

// Environment variables
const supabaseUrl = isNode ? process.env.SUPABASE_URL : import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = isNode ? process.env.SUPABASE_SERVICE_ROLE_KEY : import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const openaiKey = isNode ? process.env.OPENAI_API_KEY : import.meta.env.VITE_OPENAI_API_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseKey || !openaiKey) {
  throw new Error('Missing required environment variables');
}

// Initialize clients
const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({
  apiKey: openaiKey,
  dangerouslyAllowBrowser: !isNode
});

// Unified logging
const log = {
  info: (message: string) => {
    if (isNode) {
      console.log(message);
    } else {
      console.log(chalk.blue(message));
    }
  },
  error: (message: string) => {
    if (isNode) {
      console.error(message);
    } else {
      console.error(chalk.red(message));
    }
  },
  success: (message: string) => {
    if (isNode) {
      console.log(message);
    } else {
      console.log(chalk.green(message));
    }
  }
};

// Content generation options
export const topics = [
  'Web Development',
  'Mobile Development',
  'Data Science',
  'Machine Learning',
  'DevOps',
  'Cloud Computing',
  'Cybersecurity',
  'Blockchain',
  'Game Development',
  'IoT'
];

export const programmingLanguages = [
  'JavaScript',
  'Python',
  'Java',
  'C++',
  'Ruby',
  'Go',
  'Rust',
  'Swift',
  'Kotlin',
  'PHP'
];

export const frameworks = [
  'React',
  'Vue',
  'Angular',
  'Node.js',
  'Django',
  'Flask',
  'Spring',
  'TensorFlow',
  'PyTorch',
  'Unity'
];

export const learningStyles = [
  'visual',
  'auditory',
  'kinesthetic',
  'reading/writing'
];

export const contentPairs = [
  { level: 'beginner', type: 'guide' },
  { level: 'advanced', type: 'guide' }
];

export async function checkContentExists(
  topic: string,
  language: string,
  framework: string,
  level: string,
  learningStyle: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('consolidated_content')
      .select('content_hash')
      .contains('topics', [topic])
      .contains('programming_languages', [language])
      .contains('frameworks', [framework])
      .eq('level', level)
      .eq('learning_style', learningStyle)
      .limit(1);

    if (error) throw error;
    return data && data.length > 0;
  } catch (error) {
    log.error(`Error checking content existence: ${error.message}`);
    return false;
  }
}

export async function generateAndStorePredefinedContent(): Promise<void> {
  let totalGenerated = 0;
  let totalErrors = 0;
  const startTime = Date.now();

  log.info('Starting predefined content generation...');

  for (const topic of topics) {
    for (const language of programmingLanguages) {
      for (const framework of frameworks) {
        for (const { level, type } of contentPairs) {
          for (const learningStyle of learningStyles) {
            try {
              const exists = await checkContentExists(
                topic,
                language,
                framework,
                level,
                learningStyle
              );

              if (!exists) {
                log.info(
                  `Generating ${level} ${type} for ${topic} with ${language}/${framework} (${learningStyle} style)`
                );

                const content = await generateContent(
                  topic,
                  language,
                  framework,
                  level,
                  type,
                  learningStyle
                );

                await storeContent(
                  content,
                  topic,
                  language,
                  framework,
                  level,
                  learningStyle
                );

                totalGenerated++;
                log.success('Content generated and stored successfully');
              }
            } catch (error) {
              totalErrors++;
              log.error(
                `Error generating content for ${topic}/${language}/${framework}: ${error.message}`
              );
            }
          }
        }
      }
    }
  }

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  log.info(`
    Content Generation Summary:
    - Total generated: ${totalGenerated}
    - Total errors: ${totalErrors}
    - Duration: ${duration} seconds
  `);
}

async function generateContent(
  topic: string,
  language: string,
  framework: string,
  level: string,
  type: string,
  learningStyle: string
): Promise<string> {
  const prompt = `Create a ${level} ${type} for ${topic} using ${language} and ${framework}.
    The content should be tailored for ${learningStyle} learners.
    Include:
    1. Introduction and prerequisites
    2. Step-by-step instructions
    3. Code examples
    4. Best practices
    5. Common pitfalls
    6. Resources for further learning`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    throw new Error(`Content generation failed: ${error.message}`);
  }
}

async function storeContent(
  content: string,
  topic: string,
  language: string,
  framework: string,
  level: string,
  learningStyle: string
): Promise<void> {
  const contentHash = await generateContentHash(content);

  try {
    const { error } = await supabase.from('consolidated_content').insert({
      content_hash: contentHash,
      content,
      user_message: `${level} guide for ${topic} using ${language} and ${framework}`,
      topics: [topic],
      programming_languages: [language],
      frameworks: [framework],
      level,
      learning_style: learningStyle,
      model: 'gpt-4o-mini'
    });

    if (error) throw error;
  } catch (error) {
    throw new Error(`Failed to store content: ${error.message}`);
  }
}

async function generateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}