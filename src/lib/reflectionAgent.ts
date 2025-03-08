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
  dangerouslyAllowBrowser: !isNode // Only needed for browser environment
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

export class ReflectionAgent {
  private model: string = 'gpt-4o-mini';
  private temperature: number = 0.7;
  private maxTokens: number = 2000;

  constructor(
    private topics: string[] = [],
    private programmingLanguages: string[] = [],
    private frameworks: string[] = [],
    private level: string = 'beginner',
    private learningStyle: string = 'visual'
  ) {}

  async run(nSteps: number = 2): Promise<void> {
    try {
      log.info(`Starting reflection process with ${nSteps} steps...`);
      
      const content = await this.generate();
      if (!content) {
        throw new Error('Failed to generate initial content');
      }

      let currentContent = content;
      for (let i = 0; i < nSteps; i++) {
        log.info(`Reflection step ${i + 1}/${nSteps}`);
        currentContent = await this.reflect(currentContent);
        if (!currentContent) {
          throw new Error(`Failed at reflection step ${i + 1}`);
        }
      }

      log.success('Reflection process completed successfully');
    } catch (error) {
      log.error(`Reflection process failed: ${error.message}`);
      throw error;
    }
  }

  private async generate(): Promise<string> {
    try {
      const prompt = this.buildGenerationPrompt();
      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: this.temperature,
        max_tokens: this.maxTokens
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      log.error(`Content generation failed: ${error.message}`);
      throw error;
    }
  }

  private async reflect(content: string): Promise<string> {
    try {
      const prompt = this.buildReflectionPrompt(content);
      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: this.temperature,
        max_tokens: this.maxTokens
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      log.error(`Reflection failed: ${error.message}`);
      throw error;
    }
  }

  private buildGenerationPrompt(): string {
    return `Create educational content for ${this.topics.join(', ')} 
    using ${this.programmingLanguages.join(', ')} 
    and ${this.frameworks.join(', ')}. 
    The content should be suitable for ${this.level} level 
    and use a ${this.learningStyle} learning style.`;
  }

  private buildReflectionPrompt(content: string): string {
    return `Review and improve the following educational content:
    ${content}
    
    Consider:
    1. Clarity and accuracy
    2. ${this.level} level appropriateness
    3. ${this.learningStyle} learning style elements
    4. Technical accuracy for ${this.programmingLanguages.join(', ')}
    5. Best practices for ${this.frameworks.join(', ')}`;
  }
}