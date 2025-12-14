
import { ModelConfig } from "../types";
import { LOCAL_MODELS, updateLocalModelsStatus } from "./localModelService";

// Registry of currently supported models
export const MODEL_REGISTRY: ModelConfig[] = [
  // --- Google Gemini Models (Free Tier Available) ---
  {
    id: 'gemini-2.0-flash-exp',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    contextWindow: 1000000,
    apiKeyEnv: 'API_KEY',
    supportsImages: true,
    supportsFilesApi: true,
    maxInputWords: 750000,
    maxOutputWords: 8192,
    description: "Balanced performance for large documents.",
    capacityTag: 'High'
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'google',
    contextWindow: 1000000,
    apiKeyEnv: 'API_KEY',
    supportsImages: true,
    maxInputWords: 750000,
    maxOutputWords: 8192,
    description: "Previous generation. Best for large documents.",
    capacityTag: 'High'
  },
  
  // --- Groq Models (Verified Working) ---
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B Versatile',
    provider: 'groq',
    contextWindow: 131072,
    apiKeyEnv: 'GROQ_API_KEY',
    supportsImages: false,
    maxInputWords: 98304,
    maxOutputWords: 24576,
    description: "Very smart, large context window.",
    capacityTag: 'High'
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant',
    provider: 'groq',
    contextWindow: 131072,
    apiKeyEnv: 'GROQ_API_KEY',
    supportsImages: false,
    maxInputWords: 98304,
    maxOutputWords: 98304,
    description: "Extremely fast. Good for quick summaries.",
    capacityTag: 'High'
  },
  {
    id: 'qwen/qwen3-32b',
    name: 'Qwen 3 32B',
    provider: 'groq',
    contextWindow: 131072,
    apiKeyEnv: 'GROQ_API_KEY',
    supportsImages: false,
    maxInputWords: 98304,
    maxOutputWords: 30720,
    description: "Alibaba's powerful model with large output.",
    capacityTag: 'High'
  },
  {
    id: 'meta-llama/llama-4-scout-17b-16e-instruct',
    name: 'Llama 4 Scout 17B',
    provider: 'groq',
    contextWindow: 131072,
    apiKeyEnv: 'GROQ_API_KEY',
    supportsImages: false,
    maxInputWords: 98304,
    maxOutputWords: 6144,
    description: "Meta's Llama 4 scout variant.",
    capacityTag: 'High'
  },
  {
    id: 'meta-llama/llama-4-maverick-17b-128e-instruct',
    name: 'Llama 4 Maverick 17B',
    provider: 'groq',
    contextWindow: 131072,
    apiKeyEnv: 'GROQ_API_KEY',
    supportsImages: false,
    maxInputWords: 98304,
    maxOutputWords: 6144,
    description: "Meta's Llama 4 maverick variant.",
    capacityTag: 'High'
  },
  {
    id: 'openai/gpt-oss-120b',
    name: 'GPT OSS 120B',
    provider: 'groq',
    contextWindow: 131072,
    apiKeyEnv: 'GROQ_API_KEY',
    supportsImages: false,
    maxInputWords: 98304,
    maxOutputWords: 49152,
    description: "OpenAI's open source large model.",
    capacityTag: 'High'
  },
  {
    id: 'openai/gpt-oss-safeguard-20b',
    name: 'GPT OSS Safeguard 20B',
    provider: 'groq',
    contextWindow: 131072,
    apiKeyEnv: 'GROQ_API_KEY',
    supportsImages: false,
    maxInputWords: 98304,
    maxOutputWords: 49152,
    description: "OpenAI's safeguard model.",
    capacityTag: 'High'
  },
  {
    id: 'openai/gpt-oss-20b',
    name: 'GPT OSS 20B',
    provider: 'groq',
    contextWindow: 131072,
    apiKeyEnv: 'GROQ_API_KEY',
    supportsImages: false,
    maxInputWords: 98304,
    maxOutputWords: 49152,
    description: "OpenAI's compact open source model.",
    capacityTag: 'High'
  },
  {
    id: 'meta-llama/llama-guard-4-12b',
    name: 'Llama Guard 4 12B',
    provider: 'groq',
    contextWindow: 131072,
    apiKeyEnv: 'GROQ_API_KEY',
    supportsImages: false,
    maxInputWords: 98304,
    maxOutputWords: 768,
    description: "Meta's safety-focused model.",
    capacityTag: 'High'
  },
  {
    id: 'meta-llama/llama-prompt-guard-2-86m',
    name: 'Llama Prompt Guard 86M',
    provider: 'groq',
    contextWindow: 512,
    apiKeyEnv: 'GROQ_API_KEY',
    supportsImages: false,
    maxInputWords: 384,
    maxOutputWords: 384,
    description: "Meta's prompt safety guard.",
    capacityTag: 'Low'
  },
  {
    id: 'meta-llama/llama-prompt-guard-2-22m',
    name: 'Llama Prompt Guard 22M',
    provider: 'groq',
    contextWindow: 512,
    apiKeyEnv: 'GROQ_API_KEY',
    supportsImages: false,
    maxInputWords: 384,
    maxOutputWords: 384,
    description: "Meta's compact prompt guard.",
    capacityTag: 'Low'
  },

  // --- OpenAI Models (Paid) ---
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    contextWindow: 128000,
    apiKeyEnv: 'OPENAI_API_KEY',
    supportsImages: true,
    maxInputWords: 96000,
    maxOutputWords: 16384,
    description: "Industry standard intelligence. Paid account required.",
    capacityTag: 'High'
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    contextWindow: 128000,
    apiKeyEnv: 'OPENAI_API_KEY',
    supportsImages: true,
    maxInputWords: 96000,
    maxOutputWords: 16384,
    description: "Cost-effective and fast.",
    capacityTag: 'High'
  }
];

export const DEFAULT_MODEL_ID = 'gemini-2.0-flash-exp';

/**
 * Get all available models (online + local)
 */
export const getAllModels = (): ModelConfig[] => {
  return [...MODEL_REGISTRY, ...LOCAL_MODELS];
};

/**
 * Initialize local models (checks availability)
 * NOTE: This is now manual-only. Call from Settings to avoid startup errors.
 */
export const initializeLocalModels = async () => {
  try {
    const updatedLocalModels = await updateLocalModelsStatus();
    console.log('[Models] Local models initialized:', updatedLocalModels);
    return updatedLocalModels;
  } catch (error) {
    console.warn('[Models] Failed to initialize local models:', error);
    return [];
  }
};

export const getModel = (id: string): ModelConfig => {
  const allModels = getAllModels();
  const model = allModels.find(m => m.id === id);
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
