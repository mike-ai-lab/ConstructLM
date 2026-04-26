/**
 * Security utilities for protecting sensitive data in logs and console
 */

/**
 * Masks API keys in URLs for safe logging
 * @param url - The URL that may contain API keys
 * @returns URL with masked API key
 */
export const maskApiKeyInUrl = (url: string): string => {
  // Mask Google API keys (AIzaSy...)
  const maskedUrl = url.replace(
    /key=AIzaSy[A-Za-z0-9_-]+/g, 
    'key=AIzaSy***MASKED***'
  );
  
  // Mask other common API key patterns
  return maskedUrl
    .replace(/key=[A-Za-z0-9_-]{20,}/g, 'key=***MASKED***')
    .replace(/token=[A-Za-z0-9_-]{20,}/g, 'token=***MASKED***')
    .replace(/apikey=[A-Za-z0-9_-]{20,}/g, 'apikey=***MASKED***');
};

/**
 * Masks API keys in any string for safe logging
 * @param text - Text that may contain API keys
 * @returns Text with masked API keys
 */
export const maskApiKeys = (text: string): string => {
  return text
    .replace(/AIzaSy[A-Za-z0-9_-]+/g, 'AIzaSy***MASKED***')
    .replace(/gsk_[A-Za-z0-9_-]+/g, 'gsk_***MASKED***')
    .replace(/csk-[A-Za-z0-9_-]+/g, 'csk-***MASKED***')
    .replace(/sk-[A-Za-z0-9_-]+/g, 'sk-***MASKED***');
};

/**
 * Safe console.log that masks API keys
 */
export const safeLog = (...args: any[]) => {
  const maskedArgs = args.map(arg => {
    if (typeof arg === 'string') {
      return maskApiKeys(arg);
    }
    if (typeof arg === 'object' && arg !== null) {
      return JSON.parse(maskApiKeys(JSON.stringify(arg)));
    }
    return arg;
  });
  console.log(...maskedArgs);
};

/**
 * Safe console.error that masks API keys
 */
export const safeError = (...args: any[]) => {
  const maskedArgs = args.map(arg => {
    if (typeof arg === 'string') {
      return maskApiKeys(arg);
    }
    if (typeof arg === 'object' && arg !== null) {
      return JSON.parse(maskApiKeys(JSON.stringify(arg)));
    }
    return arg;
  });
  console.error(...maskedArgs);
};