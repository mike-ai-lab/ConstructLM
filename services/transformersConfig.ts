/**
 * transformersConfig.ts
 * MUST be imported BEFORE any other transformers imports
 * Sets up the environment to use HuggingFace CDN
 */

import { env } from '@xenova/transformers';

// Force all model requests to HuggingFace CDN
env.remoteHost = 'https://huggingface.co';
env.remotePathTemplate = '{model}/resolve/{revision}/';
env.allowRemoteModels = true;
env.allowLocalModels = false;
env.useBrowserCache = true;

console.log('[TRANSFORMERS CONFIG] Configured to use:', env.remoteHost);
console.log('[TRANSFORMERS CONFIG] Path template:', env.remotePathTemplate);

export { env };
