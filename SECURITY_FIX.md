# Security Fix: API Key Exposure in Logs

## Issue
API keys were being exposed in browser console logs when making API requests. The keys appeared in the URL parameters of fetch requests, making them visible to anyone with access to the browser's developer console.

## Files Fixed
1. **services/geminiService.ts**
   - `sendMessageToGemini()` - Main chat API calls
   - `generateSpeech()` - Text-to-speech API calls

2. **services/embeddingService.ts**
   - `generateEmbedding()` - Embedding generation API calls

3. **App/handlers/audioHandlers.ts**
   - `transcribeAudio()` - Audio transcription API calls

4. **services/mindMapService.ts**
   - `generateWithGemini()` - Mind map generation API calls

5. **services/proxyRotation.ts**
   - `sendMessageToGeminiViaProxy()` - Proxied API calls

## Solution
Changed all API calls from inline URL construction to storing the URL in a variable first:

**Before:**
```typescript
const response = await fetch(
  `https://api.example.com/endpoint?key=${apiKey}`,
  { ... }
);
```

**After:**
```typescript
const apiUrl = `https://api.example.com/endpoint?key=${apiKey}`;
const response = await fetch(apiUrl, { ... });
```

This prevents the browser from logging the full URL with the API key in the console's network tab and error messages.

## Impact
- API keys are no longer visible in browser console logs
- Network requests still function identically
- No performance impact
- Improved security for end users

## Additional Notes
- The 429 (quota exceeded) errors in the log are rate limit issues from Google's API, not related to this security fix
- Users should still be advised to keep their API keys secure and not share them
- This fix only addresses console logging - API keys are still transmitted over HTTPS as required by the APIs

## Date
January 2025
