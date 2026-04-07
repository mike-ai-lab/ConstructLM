# Vision Model Validation & Smart Token Display

## Overview
Added comprehensive validation to prevent sending images to non-vision models and implemented smart token display formatting.

## Features Implemented

### 1. Vision Model Validation

#### Pre-Send Validation
**Location:** `App/handlers/messageHandlers.ts`

Before sending any message with images:
1. Checks if images are attached (`uploadedImages.length > 0`)
2. Loads model registry to get current model capabilities
3. Validates `model.supportsImages` flag
4. If model doesn't support images:
   - Prevents message from being sent
   - Shows error message in chat
   - Logs warning to activity logger
   - Preserves images (doesn't clear them)

**Error Message Format:**
```
⚠️ Vision Not Supported

The current model (Llama 3.1 70B) does not support image inputs. Please either:

1. Remove the attached images, or
2. Switch to a vision-capable model (Gemini, GPT-4, Claude, etc.)

Your images have not been sent to avoid wasting API credits.
```

#### Visual Warning in Image Panel
**Location:** `App/components/ImageUploadPanel.tsx`

When non-vision model is selected:
- Panel background changes to warning yellow (`#fff3cd`)
- Warning banner appears at top with alert icon
- Text changes to warning colors
- Clear message about model limitation

**Warning Banner:**
```
⚠️ Current model doesn't support images. Switch to a vision model (Gemini, GPT-4, Claude) to send these images.
```

#### Real-time Model Detection
**Location:** `App/components/FloatingInput.tsx`

- Monitors `activeModelId` changes via useEffect
- Dynamically loads model registry
- Updates `modelSupportsImages` state
- Passes to ImageUploadPanel for visual feedback

### 2. Smart Token Display

#### Adaptive Formatting
**Location:** `App/components/FloatingInput.tsx` (badge)

Token display logic:
```typescript
const tokenDisplay = totalTokens < 10000 
  ? `${totalTokens} tokens`           // Under 10k: "1034 tokens"
  : `${(totalTokens / 1000).toFixed(1)}k tokens`;  // Over 10k: "32.3k tokens"
```

**Examples:**
- 850 tokens → "850 tokens"
- 1,034 tokens → "1034 tokens"
- 9,999 tokens → "9999 tokens"
- 10,000 tokens → "10.0k tokens"
- 32,450 tokens → "32.5k tokens"

**Benefits:**
- Easy to read for small numbers
- Compact for large numbers
- Consistent with image panel display
- Better UX for token tracking

## Vision-Capable Models

### Supported Models (supportsImages: true)
- **Google Gemini:** All models (2.0 Flash, 1.5 Pro, 1.5 Flash)
- **OpenAI:** GPT-4o, GPT-4o Mini
- **AWS Bedrock:** Claude 3.5 Sonnet, Claude 3 Haiku
- **OpenRouter:** Claude models, GPT-4 Vision, Gemini models
- **Ollama Cloud:** Qwen3 VL 235B

### Non-Vision Models (supportsImages: false)
- **Groq:** All Llama models
- **Cerebras:** Llama models
- **OpenRouter:** Text-only models (DeepSeek, Qwen Coder, etc.)
- **Local Models:** Code Llama

## User Experience Flow

### Scenario 1: User Uploads Image with Vision Model
1. User uploads image → Shows in panel with green/blue theme
2. Badge updates with token count
3. User sends message → Image sent successfully
4. Images cleared after sending

### Scenario 2: User Uploads Image with Non-Vision Model
1. User uploads image → Shows in panel with yellow warning theme
2. Warning banner appears: "Current model doesn't support images"
3. Badge updates with token count
4. User tries to send → Blocked with error message
5. Images remain in panel (not cleared)
6. User can either:
   - Remove images and send text only
   - Switch to vision model and send with images

### Scenario 3: User Switches Models with Images Attached
1. User has images attached with vision model (Gemini)
2. User switches to non-vision model (Llama)
3. Panel immediately changes to warning theme
4. Warning banner appears
5. Send button still works but will show error if clicked
6. User switches back to vision model
7. Panel returns to normal theme
8. Can send successfully

## Technical Implementation

### Model Registry Integration
```typescript
const { MODEL_REGISTRY } = await import('../../services/modelRegistry');
const currentModel = MODEL_REGISTRY[activeModelId];
const supportsImages = currentModel?.supportsImages ?? false;
```

### State Management
- `modelSupportsImages` state in FloatingInput
- Updates on `activeModelId` change
- Passed to ImageUploadPanel as prop
- Used for conditional styling and warnings

### Error Handling
- Graceful degradation if model registry fails
- Defaults to `false` for safety (prevents accidental sends)
- Logs warnings for debugging
- User-friendly error messages

## API Cost Protection

### How It Saves Money
1. **Prevents Wasted Tokens:** Images can consume 500-1500 tokens each
2. **Blocks Invalid Requests:** Non-vision models would reject images anyway
3. **Avoids API Errors:** Prevents failed requests that still count against quota
4. **User Awareness:** Clear warnings before any API call is made

### Example Savings
- 3 images × 1000 tokens = 3000 tokens wasted
- At $0.01 per 1k tokens = $0.03 per failed request
- With 100 failed attempts = $3.00 saved
- Plus avoided rate limit issues

## Visual Design

### Normal State (Vision Model)
- White/dark background
- Blue accent colors
- Standard hover effects
- Clean, professional look

### Warning State (Non-Vision Model)
- Yellow warning background (`#fff3cd`)
- Alert triangle icon
- Warning text colors
- Prominent banner
- Still functional (can remove images)

### Color Palette
```css
/* Warning State */
background: #fff3cd (light) / #664d03 (dark)
border: #ffc107
text: #664d03 (light) / #fff3cd (dark)

/* Normal State */
background: white (light) / #2a2a2a (dark)
border: rgba(0,0,0,0.15) (light) / rgba(255,255,255,0.1) (dark)
accent: #0078d4
```

## Testing Checklist

### Vision Validation
- [x] Upload image with Gemini → No warning, sends successfully
- [x] Upload image with Llama → Warning shown, send blocked
- [x] Switch from Gemini to Llama with images → Warning appears
- [x] Switch from Llama to Gemini with images → Warning disappears
- [x] Try to send with non-vision model → Error message shown
- [x] Images preserved after blocked send

### Token Display
- [x] 500 tokens → Shows "500 tokens"
- [x] 9,999 tokens → Shows "9999 tokens"
- [x] 10,000 tokens → Shows "10.0k tokens"
- [x] 32,450 tokens → Shows "32.5k tokens"
- [x] Updates in real-time when images added/removed

### Error Messages
- [x] Clear explanation of problem
- [x] Actionable solutions provided
- [x] Model name included in message
- [x] No technical jargon
- [x] Professional tone

## Future Enhancements

1. **Model Suggestions:** Auto-suggest vision models when images uploaded
2. **Auto-Switch:** Option to automatically switch to vision model
3. **Image Compression:** Reduce token usage for large images
4. **Format Validation:** Check image formats (some models prefer certain formats)
5. **Batch Warnings:** Warn if too many images for model's limit
6. **Cost Estimation:** Show estimated API cost before sending
