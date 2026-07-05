// lib/ai/providers/deepseek.ts
import "server-only";
import OpenAI from "openai";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";

function makeClient(keyName: string): OpenAI {
  const key = process.env[keyName];
  if (!key) throw new Error(`${keyName} environment variable is not set`);
  return new OpenAI({
    apiKey: key,
    baseURL: DEEPSEEK_BASE_URL,
  });
}

// Lazy singletons for each agent type (created on first access)
let _landing: OpenAI | null = null;
let _template: OpenAI | null = null;

export function getLandingClient(): OpenAI {
  if (!_landing) _landing = makeClient("API_KEY_NEWSLETTER_LANDING_GENERATION");
  return _landing;
}

export function getTemplateClient(): OpenAI {
  if (!_template)
    _template = makeClient("API_KEY_NEWSLETTER_TEMPLATE_GENERATION");
  return _template;
}

