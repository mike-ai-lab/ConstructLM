
import { ModelConfig } from "../types";
import { LOCAL_MODELS, updateLocalModelsStatus } from "./localModelService";

// Registry of currently supported models
export const MODEL_REGISTRY: ModelConfig[] = [
  // --- Google Gemini Models (Free Tier Available) ---
  {
    id: 'gemini-flash-latest',
    name: 'Gemini Flash (Latest)',
    provider: 'google',
    contextWindow: 1048576,
    apiKeyEnv: 'GEMINI_API_KEY',
    supportsImages: true,
    supportsFilesApi: true,
    maxInputWords: 786432,
    maxOutputWords: 49152,
    description: "Latest stable Flash. Excellent for documents.",
    capacityTag: 'High'
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    contextWindow: 1048576,
    apiKeyEnv: 'GEMINI_API_KEY',
    supportsImages: true,
    supportsFilesApi: true,
    maxInputWords: 786432,
    maxOutputWords: 49152,
    description: "Latest stable. Fast and versatile.",
    capacityTag: 'High'
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash-Lite',
    provider: 'google',
    contextWindow: 1048576,
    apiKeyEnv: 'GEMINI_API_KEY',
    supportsImages: true,
    supportsFilesApi: true,
    maxInputWords: 786432,
    maxOutputWords: 49152,
    description: "Lightweight and efficient.",
    capacityTag: 'High'
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    contextWindow: 1048576,
    apiKeyEnv: 'GEMINI_API_KEY',
    supportsImages: true,
    supportsFilesApi: true,
    maxInputWords: 786432,
    maxOutputWords: 49152,
    description: "Most capable. Higher rate limits.",
    capacityTag: 'High'
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    contextWindow: 1048576,
    apiKeyEnv: 'GEMINI_API_KEY',
    supportsImages: true,
    supportsFilesApi: true,
    maxInputWords: 786432,
    maxOutputWords: 6144,
    description: "Stable 2.0 generation.",
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
    supportsThinking: true,
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
  },

  // --- AWS Bedrock Models ---
  {
    id: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    name: 'Claude 3.5 Sonnet v2',
    provider: 'aws',
    contextWindow: 200000,
    apiKeyEnv: 'AWS_ACCESS_KEY_ID',
    supportsImages: true,
    maxInputWords: 150000,
    maxOutputWords: 8192,
    description: "Best for coding & analysis. ~$3/1M tokens.",
    capacityTag: 'High',
    awsRegion: 'us-east-1'
  },
  {
    id: 'anthropic.claude-3-haiku-20240307-v1:0',
    name: 'Claude 3 Haiku',
    provider: 'aws',
    contextWindow: 200000,
    apiKeyEnv: 'AWS_ACCESS_KEY_ID',
    supportsImages: true,
    maxInputWords: 150000,
    maxOutputWords: 4096,
    description: "Fast & cheap. ~$0.25/1M tokens.",
    capacityTag: 'High',
    awsRegion: 'us-east-1'
  },
  {
    id: 'meta.llama3-70b-instruct-v1:0',
    name: 'Llama 3 70B',
    provider: 'aws',
    contextWindow: 8192,
    apiKeyEnv: 'AWS_ACCESS_KEY_ID',
    supportsImages: false,
    maxInputWords: 6144,
    maxOutputWords: 2048,
    description: "Open source, good quality. ~$0.99/1M tokens.",
    capacityTag: 'Medium',
    awsRegion: 'us-east-1'
  },
  {
    id: 'mistral.mistral-large-2402-v1:0',
    name: 'Mistral Large',
    provider: 'aws',
    contextWindow: 32000,
    apiKeyEnv: 'AWS_ACCESS_KEY_ID',
    supportsImages: false,
    maxInputWords: 24000,
    maxOutputWords: 8192,
    description: "European model, multilingual. ~$4/1M tokens.",
    capacityTag: 'High',
    awsRegion: 'us-east-1'
  }
];

export const DEFAULT_MODEL_ID = 'gemini-2.5-flash';

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
const RATE_LIMIT_PREFIX = 'constructlm_ratelimit_';

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

// Rate Limit Management
export const setRateLimitCooldown = (modelId: string, resetTimeMs: number) => {
    localStorage.setItem(`${RATE_LIMIT_PREFIX}${modelId}`, resetTimeMs.toString());
};

export const getRateLimitCooldown = (modelId: string): number | null => {
    const stored = localStorage.getItem(`${RATE_LIMIT_PREFIX}${modelId}`);
    if (!stored) return null;
    const resetTime = parseInt(stored, 10);
    if (Date.now() >= resetTime) {
        localStorage.removeItem(`${RATE_LIMIT_PREFIX}${modelId}`);
        return null;
    }
    return resetTime;
};

export const clearRateLimitCooldown = (modelId: string) => {
    localStorage.removeItem(`${RATE_LIMIT_PREFIX}${modelId}`);
};
