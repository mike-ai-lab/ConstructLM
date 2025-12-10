
import { ModelConfig } from "../types";

// Registry of currently supported models
export const MODEL_REGISTRY: ModelConfig[] = [
  // --- Google Gemini Models (Free Tier Available) ---
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    contextWindow: 1000000,
    apiKeyEnv: 'API_KEY',
    supportsImages: true,
    description: "Best for large documents. Can read 1000+ pages.",
    capacityTag: 'High'
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'google',
    contextWindow: 1000000,
    apiKeyEnv: 'API_KEY',
    supportsImages: true,
    description: "Fast and capable. Handles large files well.",
    capacityTag: 'High'
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    contextWindow: 2000000,
    apiKeyEnv: 'API_KEY',
    supportsImages: true,
    description: "Smartest reasoning for complex construction queries.",
    capacityTag: 'High'
  },
  
  // --- Groq Models (Free/Freemium - High Performance) ---
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B (Groq)',
    provider: 'groq',
    contextWindow: 128000,
    apiKeyEnv: 'GROQ_API_KEY',
    supportsImages: false,
    description: "Very smart, but free plan limited to ~20 pages at once.",
    capacityTag: 'Medium'
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B (Groq)',
    provider: 'groq',
    contextWindow: 128000,
    apiKeyEnv: 'GROQ_API_KEY',
    supportsImages: false,
    description: "Extremely fast. Good for quick summaries of small files.",
    capacityTag: 'Medium'
  },
  {
    id: 'gemma2-9b-it',
    name: 'Gemma 2 9B (Groq)',
    provider: 'groq',
    contextWindow: 8192,
    apiKeyEnv: 'GROQ_API_KEY',
    supportsImages: false,
    description: "Google's open model. Strict size limits on free plan.",
    capacityTag: 'Low'
  },
  {
    id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B (Groq)',
    provider: 'groq',
    contextWindow: 32768,
    apiKeyEnv: 'GROQ_API_KEY',
    supportsImages: false,
    description: "Good balance of speed and smarts.",
    capacityTag: 'Medium'
  },

  // --- OpenAI Models (Paid) ---
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    contextWindow: 128000,
    apiKeyEnv: 'OPENAI_API_KEY',
    supportsImages: true,
    description: "Industry standard intelligence. Paid account required.",
    capacityTag: 'Medium'
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    contextWindow: 128000,
    apiKeyEnv: 'OPENAI_API_KEY',
    supportsImages: true,
    description: "Cost-effective and fast.",
    capacityTag: 'Medium'
  }
];

export const DEFAULT_MODEL_ID = 'gemini-2.5-flash';

export const getModel = (id: string): ModelConfig => {
  const model = MODEL_REGISTRY.find(m => m.id === id);
  if (!model) {
    console.warn(`Model ${id} not found in registry. Falling back to default.`);
    return MODEL_REGISTRY.find(m => m.id === DEFAULT_MODEL_ID)!;
  }
  return model;
};

// PREFERENCE KEYS
const STORAGE_PREFIX = 'constructlm_config_';

export const getApiKeyForModel = (model: ModelConfig): string | undefined => {
    // 1. Check LocalStorage (Runtime Config set by user in Settings)
    const storedKey = localStorage.getItem(`${STORAGE_PREFIX}${model.apiKeyEnv}`);
    if (storedKey && storedKey.trim() !== '') {
        return storedKey;
    }

    // 2. Check Environment Variables (Dev/Build Config)
    try {
        if (typeof process !== 'undefined' && process.env) {
            const envKey = process.env[model.apiKeyEnv];
            if (envKey) return envKey;
        }
    } catch (e) {
        // Ignore env errors
    }
    return undefined;
};

export const saveApiKey = (envKey: string, value: string) => {
    if (!value || value.trim() === '') {
        localStorage.removeItem(`${STORAGE_PREFIX}${envKey}`);
    } else {
        localStorage.setItem(`${STORAGE_PREFIX}${envKey}`, value.trim());
    }
};

export const getStoredApiKey = (envKey: string): string => {
    return localStorage.getItem(`${STORAGE_PREFIX}${envKey}`) || '';
};
