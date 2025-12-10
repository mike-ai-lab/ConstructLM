import { ProcessedFile, Message, ModelConfig } from "../types";
import { sendMessageToGemini } from "./geminiService";
import { sendMessageToGroq } from "./groqService";
import { getModel, getApiKeyForModel } from "./modelRegistry";

export const sendMessageToLLM = async (
  modelId: string,
  history: Message[],
  newMessage: string,
  activeFiles: ProcessedFile[],
  onStream: (chunk: string) => void
) => {
  const model = getModel(modelId);
  const apiKey = getApiKeyForModel(model);
  
  if (!apiKey) {
    throw new Error(`API key missing for ${model.name}. Add it in Settings.`);
  }

  if (model.provider === 'google') {
    return await sendMessageToGemini(history, newMessage, activeFiles, onStream);
  }
  
  if (model.provider === 'groq') {
    return await sendMessageToGroq(modelId, apiKey, history, newMessage, activeFiles, onStream);
  }
  
  throw new Error(`${model.provider} models not yet supported`);
};