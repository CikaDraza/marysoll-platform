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
let _chat: OpenAI | null = null;
let _landing: OpenAI | null = null;
let _seo: OpenAI | null = null;
let _image: OpenAI | null = null;
let _statistic: OpenAI | null = null;
let _template: OpenAI | null = null;
let _marketing: OpenAI | null = null;

export function getChatClient(): OpenAI {
  if (!_chat) _chat = makeClient("DEEPSEEK_API_KEY_CHAT");
  return _chat;
}

export function getLandingClient(): OpenAI {
  if (!_landing) _landing = makeClient("API_KEY_NEWSLETTER_LANDING_GENERATION");
  return _landing;
}

export function getSeoClient(): OpenAI {
  if (!_seo) _seo = makeClient("API_KEY_SEO_NEWSLETTER_LANDING_GENERATION");
  return _seo;
}

export function getImageClient(): OpenAI {
  if (!_image) _image = makeClient("DEEPSEEK_API_KEY_IMAGE");
  return _image;
}

export function getStatisticClient(): OpenAI {
  if (!_statistic)
    _statistic = makeClient("API_KEY_SALON_STATISTIC_PREDICTION");
  return _statistic;
}

export function getTemplateClient(): OpenAI {
  if (!_template)
    _template = makeClient("API_KEY_NEWSLETTER_TEMPLATE_GENERATION");
  return _template;
}

export function getMarketingClient(): OpenAI {
  if (!_marketing)
    _marketing = makeClient("API_KEY_MARKETING_ANALYTIC_NEWSLETTER_CAPMAIGN");
  return _marketing;
}
