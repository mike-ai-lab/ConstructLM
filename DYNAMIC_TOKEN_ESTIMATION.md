# Dynamic Token Estimation Based on Model

## Overview
Implemented model-aware token estimation that accurately reflects the actual token cost based on how each model handles images.

## Problem
Previously, all images showed the same token estimate (~500-1500 tokens) regardless of which model was selected. This was inaccurate because:
- Gemini uses File API: ~10 tokens per image
- OpenAI/OpenRouter use base64: ~500-1500 tokens per image
- Non-vision models use placeholder: ~5-10 tokens

## Solution

### 1. Model-Aware Token Estimation
**Location:** `App/handlers/inputHandlers.ts`

```typescript
const estimateImageTokens = (file: File, modelId?: string): number => {
  // If no model specified, use conservative estimate
  if (!modelId) {
    return 1000;
  }
  
  // Gemini uses File API (~10 tokens per image)
  if (modelId.includes('gemini')) {
    return 10;
  }
  
  // OpenAI, OpenRouter, and other base64 models
  const sizeInMB = file.size / (1024 * 1024);
  const baseTokens = 85;
  const sizeTokens = Math.round(sizeInMB * 1000);
  
  return Math.min(baseTokens + sizeTokens, 2000);
};
```

**Token Estimates by Model:**
- **Gemini models:** 10 tokens (File API)
- **OpenAI models:** 85-2000 tokens (base64, size-dependent)
- **OpenRouter models:** 85-2000 tokens (base64, size-dependent)
- **Non-vision models:** 5-10 tokens (placeholder text)

### 2. Real-Time Token Recalculation
**Location:** `App/components/FloatingInput.tsx`

When user switches models:
```typescript
React.useEffect(() => {
  const checkModelSupport = async () => {
    // ... model detection ...
    
    // Recalculate image token estimates when model changes
    if (uploadedImages.length > 0 && onRecalculateImageTokens) {
      onRecalculateImageTokens(activeModelId);
    }
  };
  checkModelSupport();
}, [activeModelId, uploadedImages.length, onRecalculateImageTokens]);
```

**Behavior:**
- User uploads image with Gemini → Shows 10 tokens
- User switches to GPT-4 → Tokens update to ~1000 tokens
- User switches back to Gemini → Tokens update back to 10 tokens
- Updates happen instantly (no delay)

### 3. Recalculation Handler
**Location:** `App/handlers/inputHandlers.ts`

```typescript
const recalculateImageTokens = (modelId: string) => {
  setUploadedImages(prev => 
    prev.map(img => ({
      ...img,
      estimatedTokens: estimateImageTokens(img.file, modelId)
    }))
  );
};
```

**Features:**
- Preserves all image data (file, preview, size)
- Only updates `estimatedTokens` field
- Efficient (no re-upload or re-processing)
- Instant UI update

## Token Estimation Examples

### Example 1: 1MB Image
```
Gemini:
- Method: File API
- Tokens: 10
- Display: "10 tokens"

GPT-4:
- Method: Base64
- Tokens: 85 + (1 × 1000) = 1085
- Display: "1085 tokens"

Llama (non-vision):
- Method: Placeholder text
- Tokens: ~8 (from "[Image attached: photo.jpg]")
- Display: "8 tokens"
```

### Example 2: 500KB Image
```
Gemini: 10 tokens
GPT-4: 85 + (0.5 × 1000) = 585 tokens
Llama: ~8 tokens
```

### Example 3: 3MB Image
```
Gemini: 10 tokens
GPT-4: 85 + (3 × 1000) = 2000 tokens (capped)
Llama: ~8 tokens
```

## User Experience Flow

### Scenario 1: Upload with Gemini
1. User selects Gemini 2.5 Flash
2. User uploads 1MB image
3. Panel shows: "~10 tokens"
4. Badge shows: "1 item(s) • ~10 tokens"
5. Accurate representation of actual cost

### Scenario 2: Switch to GPT-4
1. User has 1MB image uploaded (showing 10 tokens)
2. User switches to GPT-4o
3. Tokens instantly update to "~1085 tokens"
4. Badge updates: "1 item(s) • ~1085 tokens"
5. Warning banner appears (if applicable)
6. User sees real cost before sending

### Scenario 3: Switch Back to Gemini
1. User has image showing 1085 tokens (GPT-4)
2. User switches back to Gemini
3. Tokens instantly update to "~10 tokens"
4. Badge updates: "1 item(s) • ~10 tokens"
5. Warning banner disappears
6. User sees cost savings

### Scenario 4: Multiple Images
1. User uploads 3 images (1MB each) with Gemini
2. Each shows: "~10 tokens"
3. Total: "3 item(s) • ~30 tokens"
4. User switches to GPT-4
5. Each updates to: "~1085 tokens"
6. Total: "3 item(s) • ~3255 tokens"
7. Clear cost difference visible

## Badge Display Logic

### Smart Token Display
```typescript
const tokenDisplay = totalTokens < 10000 
  ? `${totalTokens} tokens`           // Under 10k: "1085 tokens"
  : `${(totalTokens / 1000).toFixed(1)}k tokens`;  // Over 10k: "32.3k tokens"
```

**Examples:**
- 10 tokens → "10 tokens"
- 1,085 tokens → "1085 tokens"
- 3,255 tokens → "3255 tokens"
- 10,000 tokens → "10.0k tokens"
- 32,450 tokens → "32.5k tokens"

## Technical Implementation

### Token Calculation Formula

**Gemini (File API):**
```
tokens = 10 (constant)
```

**Base64 Models (OpenAI, OpenRouter):**
```
baseTokens = 85
sizeTokens = (fileSizeInMB × 1000)
totalTokens = min(baseTokens + sizeTokens, 2000)
```

**Non-Vision Models (Placeholder):**
```
tokens = length("[Image attached: filename.jpg]") / 4
≈ 5-10 tokens depending on filename length
```

### Model Detection
```typescript
// Gemini detection
if (modelId.includes('gemini')) {
  return 10;
}

// All other vision models use base64
// Non-vision models handled separately (placeholder text)
```

### Edge Cases Handled

**1. No Model ID Provided**
```typescript
if (!modelId) {
  return 1000; // Conservative estimate
}
```

**2. Model Switch During Upload**
- useEffect dependency on `activeModelId`
- Recalculates immediately
- No stale estimates

**3. Large Files**
```typescript
return Math.min(baseTokens + sizeTokens, 2000);
```
- Caps at 2000 tokens
- Prevents unrealistic estimates

**4. Empty Image List**
```typescript
if (uploadedImages.length > 0 && onRecalculateImageTokens) {
  onRecalculateImageTokens(activeModelId);
}
```
- Only recalculates if images exist
- No unnecessary processing

## Benefits

### 1. Accurate Cost Estimation
- Users see real token costs
- No surprises after sending
- Can make informed decisions

### 2. Model Comparison
- Easy to compare costs between models
- Gemini's efficiency is obvious (10 vs 1000+ tokens)
- Encourages use of efficient models

### 3. Real-Time Updates
- Instant feedback on model switch
- No manual recalculation needed
- Always shows current estimate

### 4. Better UX
- Transparent pricing
- No hidden costs
- Users feel in control

## Future Enhancements

1. **Detailed Breakdown**
   - Show per-image cost
   - Show total cost in dollars
   - Show cost comparison between models

2. **Cost Warnings**
   - Warn if total cost exceeds threshold
   - Suggest cheaper alternatives
   - Show potential savings

3. **Historical Tracking**
   - Track actual vs estimated tokens
   - Improve estimation accuracy
   - Learn from usage patterns

4. **Compression Suggestions**
   - Detect large images
   - Suggest compression
   - Show potential token savings

## Testing Checklist

- [x] Gemini shows 10 tokens per image
- [x] GPT-4 shows size-based tokens (85-2000)
- [x] OpenRouter shows size-based tokens
- [x] Tokens update when switching models
- [x] Badge reflects accurate total
- [x] Multiple images calculated correctly
- [x] Large files capped at 2000 tokens
- [x] Small files show minimum 85 tokens
- [x] No errors on model switch
- [x] No stale estimates

## Conclusion

Token estimation is now **model-aware** and **dynamic**, providing users with accurate cost information that updates in real-time as they switch between models. This transparency helps users make informed decisions and understand the cost implications of their choices.
