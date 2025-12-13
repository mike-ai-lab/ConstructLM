import { Message, ProcessedFile, ModelConfig } from "../types";

/**
 * Local Model Service - Ollama Integration
 * 
 * SETUP INSTRUCTIONS:
 * 
 * 1. Install Ollama from https://ollama.ai
 * 
 * 2. Place your model files in a directory (e.g., F:\Automations\Models\)
 *    - codellama-7b-instruct.Q4_K_M.gguf
 *    - codellama.Modelfile
 * 
 * 3. Create the model in Ollama:
 *    - Open Command Prompt/PowerShell
 *    - Navigate to your models directory: cd F:\Automations\Models\
 *    - Run: ollama create codellama -f codellama.Modelfile
 * 
 * 4. Verify the model is loaded:
 *    - Run: ollama list
 *    - You should see "codellama" in the list
 * 
 * 5. Start Ollama service:
 *    - Ollama runs on http://localhost:11434 by default
 *    - The service should auto-start or you can run: ollama serve
 * 
 * 6. Test the connection in ConstructLM Settings
 *    - Open Settings (Gear Icon)
 *    - Look for "Local Models" section
 *    - Click "Test Connection" to verify Ollama is running
 */

const OLLAMA_BASE_URL = 'http://localhost:11434';
const OLLAMA_TIMEOUT = 30000; // 30 seconds for local models

export interface LocalModelConfig extends ModelConfig {
  provider: 'local';
  modelName: string; // The name used in Ollama (e.g., 'codellama')
  isAvailable?: boolean;
}

// Local models registry
export const LOCAL_MODELS: LocalModelConfig[] = [
  {
    id: 'codellama-local',
    name: 'Code Llama 7B (Local)',
    provider: 'local',
    modelName: 'codellama',
    contextWindow: 4096,
    apiKeyEnv: 'LOCAL_MODEL_ENABLED',
    supportsImages: false,
    description: 'Local Code Llama model. No API key needed. Runs on your machine.',
    capacityTag: 'Medium',
    isAvailable: false
  }
];

/**
 * Check if Ollama service is running and accessible
 */
export const checkOllamaConnection = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.warn('[Ollama] Connection check failed:', error);
    return false;
  }
};

/**
 * Get list of available models from Ollama
 */
export const getAvailableOllamaModels = async (): Promise<string[]> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    return data.models?.map((m: any) => m.name) || [];
  } catch (error) {
    console.warn('[Ollama] Failed to fetch models:', error);
    return [];
  }
};

/**
 * Stream response from local Ollama model
 */
export const streamLocalModel = async (
  modelName: string,
  messages: Array<{ role: string; content: string }>,
  onStream: (chunk: string) => void
): Promise<string> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT);

    // Convert messages to prompt format
    const prompt = messages
      .map(m => `${m.role === 'system' ? 'System' : m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        prompt: prompt,
        stream: true,
        temperature: 0.2,
        num_predict: 2048
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Ollama API Error ${response.status}`);
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
            if (json.response) {
              onStream(json.response);
              fullResponse += json.response;
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
      throw new Error('Local model request timeout (30s)');
    }
    throw error;
  }
};

/**
 * Check if a specific model is available in Ollama
 */
export const isModelAvailable = async (modelName: string): Promise<boolean> => {
  try {
    const models = await getAvailableOllamaModels();
    return models.includes(modelName);
  } catch (error) {
    return false;
  }
};

/**
 * Update local models availability status
 */
export const updateLocalModelsStatus = async (): Promise<LocalModelConfig[]> => {
  const isConnected = await checkOllamaConnection();

  if (!isConnected) {
    return LOCAL_MODELS.map(m => ({ ...m, isAvailable: false }));
  }

  const availableModels = await getAvailableOllamaModels();

  return LOCAL_MODELS.map(m => ({
    ...m,
    isAvailable: availableModels.includes(m.modelName)
  }));
};

/**
 * Get setup instructions for local models
 */
export const getLocalModelSetupInstructions = (): string => {
  return `
LOCAL MODEL SETUP GUIDE
=======================

1. INSTALL OLLAMA
   - Download from: https://ollama.ai
   - Install and run the application
   - Ollama will start automatically on http://localhost:11434

2. PREPARE YOUR MODEL FILES
   Place these files in a directory (e.g., F:\\Automations\\Models\\):
   - codellama-7b-instruct.Q4_K_M.gguf (the model weights)
   - codellama.Modelfile (the model configuration)

3. CREATE THE MODEL IN OLLAMA
   - Open Command Prompt or PowerShell
   - Navigate to your models directory:
     cd F:\\Automations\\Models\\
   - Create the model:
     ollama create codellama -f codellama.Modelfile
   - Wait for completion (may take a few minutes)

4. VERIFY INSTALLATION
   - Run: ollama list
   - You should see "codellama" in the output

5. TEST IN CONSTRUCTLM
   - Open Settings (Gear Icon)
   - Look for "Local Models" section
   - Click "Test Connection"
   - If successful, you can now use local models as fallback

TROUBLESHOOTING
===============
- If connection fails: Make sure Ollama is running (check system tray)
- If model not found: Verify the Modelfile path and model name
- For slow responses: Local models are slower than cloud APIs
- Check Ollama logs: Run 'ollama serve' in terminal to see debug info

FALLBACK BEHAVIOR
=================
When you reach quota limits on online models:
1. The system will automatically detect the quota error
2. It will offer to switch to local models if available
3. You can manually select a local model from the model dropdown
4. Local models will work offline and won't count against quotas
`;
};
