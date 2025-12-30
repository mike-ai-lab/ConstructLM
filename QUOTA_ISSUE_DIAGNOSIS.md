# Gemini API Quota Issue - Immediate 429 Errors

## Problem
Brand new Gemini API keys are instantly hitting 429 (quota exceeded) errors, even on first request.

## Possible Causes

### 1. **IP-Based Rate Limiting** (Most Likely)
Google may be rate limiting your IP address if:
- Multiple API keys were created/tested from same IP
- Previous keys hit rate limits from this IP
- IP is flagged for excessive requests

**Solution:**
- Try from a different network (mobile hotspot, VPN, different location)
- Wait 24 hours before testing new keys
- Check Google Cloud Console for actual quota usage

### 2. **Cached API Keys in Browser**
Old API keys might still be stored in localStorage.

**Solution:**
```javascript
// Open browser console (F12) and run:
localStorage.clear();
// Then refresh page and add new API key
```

### 3. **Multiple Simultaneous Requests**
The app might be making multiple requests at once:
- Embedding generation (for RAG)
- Main chat request
- Background processes

**Check in Console:**
Look for multiple `[GEMINI]` or `[EMBEDDING]` log entries happening simultaneously.

### 4. **Google AI Studio vs Google Cloud**
There are TWO different Gemini API systems:

**Google AI Studio (Free Tier):**
- URL: https://aistudio.google.com/apikey
- Endpoint: `generativelanguage.googleapis.com`
- Limits: 15 RPM (requests per minute), 1M TPM (tokens per minute)
- **IMPORTANT:** Shared quota across ALL keys from same Google account

**Google Cloud (Paid):**
- URL: https://console.cloud.google.com/
- Endpoint: Different (uses project-based auth)
- Higher limits

**If you're using Google AI Studio:**
- Creating multiple keys from SAME Google account shares the SAME quota
- If one key hits limit, ALL keys from that account are limited
- Solution: Use a completely different Google account

### 5. **Embedding Service Auto-Running**
The RAG embedding service might be processing files automatically.

**Check:** Look for `[EMBEDDING]` logs in console when app loads.

## Immediate Actions

### Step 1: Clear Everything
```javascript
// In browser console (F12):
localStorage.clear();
indexedDB.deleteDatabase('constructlm-files');
indexedDB.deleteDatabase('constructlm-vector-store');
```

### Step 2: Check Actual Quota
1. Go to https://aistudio.google.com/
2. Click on your API key
3. Check "Usage" tab
4. See if quota is actually exhausted

### Step 3: Test with Minimal Request
1. Clear browser cache
2. Open app in incognito/private window
3. Add API key
4. Send ONE simple message: "hello"
5. Check console for number of API calls

### Step 4: Try Different Provider
Use Groq (also free) to verify app works:
1. Get Groq API key: https://console.groq.com/
2. Add in Settings
3. Switch to Groq model
4. Test if it works

## Debugging Commands

### Check localStorage Keys
```javascript
// In browser console:
Object.keys(localStorage).filter(k => k.includes('API') || k.includes('GEMINI'))
```

### Monitor API Calls
```javascript
// In browser console before sending message:
let apiCallCount = 0;
const originalFetch = window.fetch;
window.fetch = function(...args) {
  if (args[0].includes('generativelanguage.googleapis.com')) {
    apiCallCount++;
    console.log(`🔴 API CALL #${apiCallCount}:`, args[0].split('?')[0]);
  }
  return originalFetch.apply(this, args);
};
```

### Check for Background Processes
```javascript
// Check if embedding service is running:
console.log('Embedding service ready:', window.embeddingService?.isReady());
```

## Expected Behavior

**Normal first message should make:**
1. ONE embedding request (if RAG enabled)
2. ONE chat request
3. Total: 2 API calls maximum

**If you see more than 2 calls, something is wrong.**

## Google AI Studio Quota Limits

**Free Tier:**
- 15 requests per minute
- 1 million tokens per minute
- 1,500 requests per day

**If you hit these limits:**
- Wait 24 hours
- OR use different Google account
- OR switch to Groq (unlimited free tier)

## Contact Google Support

If issue persists:
1. Go to https://aistudio.google.com/
2. Click "Help" → "Send Feedback"
3. Explain: "New API keys instantly return 429 errors"
4. Include: Your Google account email, API key (first 10 chars only)

## Alternative: Use Groq Instead

Groq offers FREE unlimited API access:
- Models: Llama 3.3 70B, Llama 3.1 8B, Qwen 3 32B
- Speed: 10x faster than Gemini
- No rate limits on free tier
- Get key: https://console.groq.com/

## Next Steps

1. Try clearing localStorage and testing in incognito
2. Check actual quota usage in Google AI Studio
3. Monitor API call count using debug script above
4. If still failing, switch to Groq temporarily
5. Contact Google support if issue persists

---

**Most Likely Cause:** Your IP or Google account is rate-limited from previous testing. Wait 24 hours or use Groq.
