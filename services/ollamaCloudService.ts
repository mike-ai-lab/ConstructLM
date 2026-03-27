import { Message, ModelConfig } from "../types";

/**
 * Ollama Cloud Service - Cloud Model Integration
 * 
 * SETUP INSTRUCTIONS:
 * 
 * 1. Create Ollama Cloud Account
 *    - Go to https://ollama.com
 *    - Sign up for an account
 * 
 * 2. Generate API Key
 *    - Go to Account Settings
 *    - Generate a new API key
 *    - Copy the key (you'll need it in ConstructLM)
 * 
 * 3. Start Proxy Server
 *    - Open a terminal in the ConstructLM-1 directory
 *    - Run: node proxy-server.js
 *    - You should see: "✅ Ollama Cloud Proxy running on http://localhost:3001"
 * 
 * 4. Configure in ConstructLM
 *    - Open Settings (Gear Icon)
 *    - Go to "Ollama Cloud" section
 *    - Paste your API key
 *    - Click "Test Connection"
 *    - Select a cloud model from the dropdown
 * 
 * 5. Start Using Cloud Models
 *    - Type your message
 *    - The app will use the selected cloud model
 *    - Responses will stream in real-time
 */

const PROXY_URL = 'http://localhost:3002/api/ollama-proxy';

export interface OllamaCloudConfig extends ModelConfig {
  provider: 'ollama-cloud';
  modelId: string;
  isAvailable?: boolean;
}

// Ollama Cloud models registry
export const OLLAMA_CLOUD_MODELS: OllamaCloudConfig[] = [
  {
    id: 'gpt-oss:120b-cloud',
    name: 'GPT-OSS 120B Cloud',
    provider: 'ollama-cloud',
    modelId: 'gpt-oss:120b-cloud',
    contextWindow: 32768,
    apiKeyEnv: 'OLLAMA_CLOUD_API_KEY',
    supportsImages: false,
    description: 'GPT-OSS 120B model on Ollama Cloud',
    capacityTag: 'Large',
    isAvailable: true
  },
  {
    id: 'gpt-oss:20b-cloud',
    name: 'GPT-OSS 20B Cloud',
    provider: 'ollama-cloud',
    modelId: 'gpt-oss:20b-cloud',
    contextWindow: 32768,
    apiKeyEnv: 'OLLAMA_CLOUD_API_KEY',
    supportsImages: false,
    description: 'GPT-OSS 20B model on Ollama Cloud',
    capacityTag: 'Medium',
    isAvailable: true
  },
  {
    id: 'deepseek-v3.1:671b-cloud',
    name: 'DeepSeek V3.1 671B Cloud',
    provider: 'ollama-cloud',
    modelId: 'deepseek-v3.1:671b-cloud',
    contextWindow: 131072,
    apiKeyEnv: 'OLLAMA_CLOUD_API_KEY',
    supportsImages: false,
    description: 'DeepSeek V3.1 671B reasoning model on Ollama Cloud',
    capacityTag: 'XLarge',
    isAvailable: true
  },
  {
    id: 'qwen3-coder:480b-cloud',
    name: 'Qwen3 Coder 480B Cloud',
    provider: 'ollama-cloud',
    modelId: 'qwen3-coder:480b-cloud',
    contextWindow: 32768,
    apiKeyEnv: 'OLLAMA_CLOUD_API_KEY',
    supportsImages: false,
    description: 'Qwen3 Coder 480B model on Ollama Cloud - optimized for coding',
    capacityTag: 'XLarge',
    isAvailable: true
  },
  {
    id: 'qwen3-vl:235b-cloud',
    name: 'Qwen3 VL 235B Cloud',
    provider: 'ollama-cloud',
    modelId: 'qwen3-vl:235b-cloud',
    contextWindow: 32768,
    apiKeyEnv: 'OLLAMA_CLOUD_API_KEY',
    supportsImages: true,
    description: 'Qwen3 VL 235B vision-language model on Ollama Cloud',
    capacityTag: 'Large',
    isAvailable: true
  },
  {
    id: 'minimax-m2:cloud',
    name: 'MiniMax M2 Cloud',
    provider: 'ollama-cloud',
    modelId: 'minimax-m2:cloud',
    contextWindow: 32768,
    apiKeyEnv: 'OLLAMA_CLOUD_API_KEY',
    supportsImages: false,
    description: 'MiniMax M2 model on Ollama Cloud',
    capacityTag: 'Medium',
    isAvailable: true
  },
  {
    id: 'glm-4.6:cloud',
    name: 'GLM 4.6 Cloud',
    provider: 'ollama-cloud',
    modelId: 'glm-4.6:cloud',
    contextWindow: 131072,
    apiKeyEnv: 'OLLAMA_CLOUD_API_KEY',
    supportsImages: false,
    description: 'GLM 4.6 reasoning model on Ollama Cloud',
    capacityTag: 'Large',
    isAvailable: true
  }
];

/**
 * Check if proxy server is running
 */
export const checkProxyConnection = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${PROXY_URL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'test',
        messages: [],
        apiKey: 'test'
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    // We expect 400 (missing apiKey) or 401 (invalid key), not 404 (proxy not found)
    return response.status !== 404;
  } catch (error) {
    return false;
  }
};

/**
 * Stream response from Ollama Cloud model
 */
export const streamOllamaCloud = async (
  modelId: string,
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  onStream: (chunk: string) => void
): Promise<string> => {
  try {
    if (!apiKey) {
      throw new Error('Ollama Cloud API key is required');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes

    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        messages: messages.map(m => ({
          role: m.role === 'system' ? 'system' : m.role === 'user' ? 'user' : 'assistant',
          content: m.content
        })),
        stream: true,
        temperature: 0.7,
        apiKey: apiKey
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Ollama Cloud API error (${response.status}): ${errorData.error || response.statusText}`);
    }

    if (!response.body) throw new Error('No response body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const json = JSON.parse(line);
            if (json.message?.content) {
              const chunk = json.message.content;
              onStream(chunk);
              fullResponse += chunk;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }

    return fullResponse;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Ollama Cloud request timeout (2 minutes)');
    }
    throw error;
  }
};

/**
 * Get setup instructions for Ollama Cloud
 */
export const getOllamaCloudSetupInstructions = (): string => {
  return `
OLLAMA CLOUD SETUP GUIDE
========================

1. CREATE OLLAMA CLOUD ACCOUNT
   - Go to: https://ollama.com
   - Sign up for an account
   - Verify your email

2. GENERATE API KEY
   - Log in to your Ollama Cloud account
   - Go to Account Settings
   - Click "Generate API Key"
   - Copy the key (save it somewhere safe)

3. START PROXY SERVER
   - Open a terminal in the ConstructLM-1 directory
   - Run: node proxy-server.js
   - You should see:
     ✅ Ollama Cloud Proxy running on http://localhost:3001
     📍 Endpoint: POST http://localhost:3001/api/ollama-proxy

4. CONFIGURE IN CONSTRUCTLM
   - Open Settings (Gear Icon)
   - Go to "Ollama Cloud" section
   - Paste your API key in the input field
   - Click "Test Connection"
   - If successful, you can now use cloud models

5. SELECT A CLOUD MODEL
   - Click the model dropdown in the header
   - Look for "Ollama Cloud" section
   - Select a model (e.g., "gpt-oss:120b-cloud")
   - Type your message and send

AVAILABLE CLOUD MODELS
======================
- gpt-oss:120b-cloud - Large general purpose model
- gpt-oss:20b-cloud - Medium general purpose model
- deepseek-v3.1:671b-cloud - Advanced reasoning model
- qwen3-coder:480b-cloud - Optimized for coding
- qwen3-vl:235b-cloud - Vision-language model
- minimax-m2:cloud - Efficient model
- glm-4.6:cloud - Advanced reasoning model

TROUBLESHOOTING
===============
- Proxy not running: Make sure you ran "node proxy-server.js"
- API key invalid: Check your Ollama Cloud account settings
- Model not found: Verify the model name is correct
- Connection timeout: Check your internet connection
- 401 Unauthorized: Your API key is invalid or expired

PROXY SERVER REQUIREMENTS
=========================
- Node.js must be installed
- Express.js must be installed (npm install express)
- Proxy runs on port 3001 (make sure it's not in use)
- Proxy must be running for cloud models to work
`;
};
