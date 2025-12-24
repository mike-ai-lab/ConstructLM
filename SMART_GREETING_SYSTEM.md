# Smart Greeting System Implementation

## Overview
Replaced the static, repetitive AI greeting with a personalized, context-aware greeting system that adapts to each user.

## Features Implemented

### 1. User Profile Service (`services/userProfileService.ts`)
- Stores user preferences locally
- Tracks:
  - Name (optional)
  - Role/Job (optional)
  - Country/Timezone (optional)
  - Greeting style preference (professional/casual/minimal)
  - Areas of interest (optional)
  - Session tracking (first visit, last visit, session count)
  - Onboarding completion status

### 2. Smart Greeting Generator (`services/greetingService.ts`)
Generates dynamic greetings based on:
- **Time of day**: Morning/Afternoon/Evening
- **User profile**: Name, role, preferences
- **Visit type**: First-ever, first with profile, returning user
- **Greeting style**: Professional, casual, or minimal

#### Greeting Logic:
1. **First-Ever Visit** (no profile):
   - Warm welcome with onboarding prompt
   - Overview of capabilities
   - Suggestion to personalize in Settings

2. **First Visit with Profile**:
   - Personalized greeting with name
   - Role-specific context
   - Capability overview

3. **Returning User**:
   - Brief, personalized greeting
   - Rotating capability highlights
   - Respects minimal preference

4. **Same Session** (refresh/new chat):
   - Minimal greeting, ready to work

### 3. Settings Integration
Added "User Profile" section to Settings Modal:
- Name input (optional)
- Role input (optional)
- Greeting style selector:
  - **Professional**: Formal, time-based greetings
  - **Casual**: Friendly, varied greetings
  - **Minimal**: Brief, to-the-point

### 4. Session Tracking
- Automatically records visits on app load
- Tracks session count for smart greeting logic
- No manual intervention required

## Example Greetings

### First-Ever Visit:
```
Hello! I'm Construct AI LM, your AI assistant.

Before we start, would you like to personalize your experience? 
You can set this up in Settings (⚙️) anytime.

I can help you with:
• Code development & debugging
• Document analysis (PDF, Excel, images)
• Architecture & design questions
• And much more!

**Tip:** Type "@" to mention files, or just drag and drop them here.
```

### First Visit (with profile - Alex, Developer):
```
Good morning, Alex! 👋 Welcome to ConstructLM.

As a Developer, I can help you with code reviews, debugging, 
document analysis, and more. What are we building today?
```

### Returning User (casual style):
```
Hey, Alex! I can help with code, debugging, or architecture questions.
```

### Returning User (minimal style):
```
Hey, Alex! Ready when you are.
```

## Technical Details

### Files Modified:
1. `services/chatRegistry.ts` - Updated to use greetingService
2. `components/SettingsModal.tsx` - Added user profile section
3. `App.tsx` - Added visit tracking on mount

### Files Created:
1. `services/userProfileService.ts` - User profile management
2. `services/greetingService.ts` - Smart greeting generation

### Storage:
- User profile stored in localStorage: `constructlm_user_profile`
- Persists across sessions
- Can be cleared via "Clear All App Data" in Settings

## Benefits

1. **Personalized Experience**: Users feel recognized and valued
2. **Context-Aware**: Greetings adapt to time of day and user preferences
3. **Non-Repetitive**: Varied greetings prevent monotony
4. **Optional**: Users can skip personalization if desired
5. **Privacy-Focused**: All data stored locally, no external tracking

## Future Enhancements (Optional)

- Detect project type from workspace files
- Remember last conversation topic
- Suggest relevant features based on usage patterns
- Multi-language support based on country
- Integration with workspace context for smarter greetings
