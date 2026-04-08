import { UserProfile, userProfileService } from './userProfileService';

const ASSISTANT_NAME = 'ConstructLM';

class GreetingService {
  private cachedGreeting: string | null = null;
  private cachedSessionId: number | null = null;
  private getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  private getTimeGreeting(profile: UserProfile | null, sessionCount: number): string {
    const timeOfDay = this.getTimeOfDay();
    const style = profile?.greetingStyle || 'casual';
    
    // Cache greeting per session to avoid flicker
    if (this.cachedSessionId === sessionCount && this.cachedGreeting) {
      return this.cachedGreeting;
    }
    
    let greeting: string;
    
    if (style === 'minimal') {
      greeting = 'Hey';
    } else if (style === 'professional') {
      greeting = `Good ${timeOfDay}`;
    } else {
      // casual - only randomize on first visit
      const greetings = {
        morning: ['Good morning', 'Morning', 'Hey there'],
        afternoon: ['Good afternoon', 'Hey', 'Hi'],
        evening: ['Good evening', 'Evening', 'Hey']
      };
      const options = greetings[timeOfDay as keyof typeof greetings];
      const index = sessionCount === 1 ? Math.floor(Math.random() * options.length) : 0;
      greeting = options[index];
    }
    
    this.cachedGreeting = greeting;
    this.cachedSessionId = sessionCount;
    return greeting;
  }

  private getCapabilityHighlight(): string {
    const capabilities = [
      'I can help with code, debugging, or architecture questions.',
      'I can analyze documents, answer questions, or help you build something.',
      'I can assist with coding, document analysis, or brainstorming ideas.',
      'I can help you write code, review documents, or solve problems.',
      'Ready to code, analyze files, or tackle any challenge you have.'
    ];
    return capabilities[Math.floor(Math.random() * capabilities.length)];
  }

  private getTemplateGreeting(): string {
    const profile = userProfileService.getProfile();
    const isFirstEver = userProfileService.isFirstVisit();
    const sessionCount = profile?.sessionCount || 1;
    
    // Determine user state based on sessionCount (source of truth)
    const isReturning = sessionCount > 1;
    const isFirstWithProfile = !isFirstEver && sessionCount === 1 && profile;

    // First-ever visit - onboarding
    if (isFirstEver) {
      return `Hello! I'm ${ASSISTANT_NAME}, your AI assistant.\n\nBefore we start, would you like to personalize your experience? You can set this up in Settings anytime.\n\nI can help you with:\n- Code development & debugging\n- Document analysis (PDF, Excel, images)\n- Architecture & design questions\n- And much more!\n\nTip: Type "@" to mention files, or just drag and drop them here.`;
    }

    // First visit with profile
    if (isFirstWithProfile) {
      const greeting = this.getTimeGreeting(profile, sessionCount);
      const name = profile.name ? `, ${profile.name}` : '';
      const role = profile.role ? ` As a ${profile.role}, ` : ' ';
      
      return `${greeting}${name}! Welcome to ${ASSISTANT_NAME}.\n\n${role}I can help you with code reviews, debugging, document analysis, and more. What are we building today?`;
    }

    // Returning user - brief personalized greeting
    if (profile && isReturning) {
      const greeting = this.getTimeGreeting(profile, sessionCount);
      const name = profile.name ? `, ${profile.name}` : '';
      
      if (profile.greetingStyle === 'minimal') {
        return `${greeting}${name}! Ready when you are.`;
      }
      
      return `${greeting}${name}! ${this.getCapabilityHighlight()}`;
    }

    // Default fallback (no profile, but not first visit)
    return `Hey! ${this.getCapabilityHighlight()}\n\nTip: Type "@" to mention files.`;
  }

  async generateGreeting(modelId?: string): Promise<string> {
    const profile = userProfileService.getProfile();
    const isFirstEver = userProfileService.isFirstVisit();
    
    // Always use template for first-ever visit (onboarding)
    if (isFirstEver) {
      return this.getTemplateGreeting();
    }

    // If user has provided profile info (name or role) AND modelId is provided, generate AI greeting
    if (profile && (profile.name || profile.role) && modelId) {
      try {
        const aiGreeting = await this.generateAIGreeting(profile, modelId);
        if (aiGreeting) {
          return aiGreeting;
        }
      } catch (error) {
        console.warn('Failed to generate AI greeting, falling back to template:', error);
      }
    }

    // Fallback to template greeting
    return this.getTemplateGreeting();
  }

  private async generateAIGreeting(profile: UserProfile, modelId: string): Promise<string | null> {
    try {
      // Dynamically import llmService to avoid circular dependencies
      const { sendMessageToLLM } = await import('./llmService');
      const { getModel, getApiKeyForModel } = await import('./modelRegistry');
      
      const timeOfDay = this.getTimeOfDay();
      const style = profile.greetingStyle || 'casual';
      const name = profile.name || 'there';
      
      console.log('[Greeting] Using model:', modelId);
      
      // Check if the model has an API key configured
      const model = getModel(modelId);
      console.log('[Greeting] Model found:', model.name, 'Provider:', model.provider);
      
      const apiKey = getApiKeyForModel(model);
      
      if (!apiKey) {
        console.warn(`[Greeting] No API key found for model ${modelId} (${model.provider}), falling back to template greeting`);
        return null;
      }
      
      console.log('[Greeting] API key found! Generating ultra-short greeting with', model.name);
      
      // Create ultra-short prompt based on greeting style (4-5 words max)
      let prompt = '';
      
      if (style === 'minimal') {
        prompt = `Generate a VERY brief greeting for ${name}. Maximum 4-5 words. Be direct and minimal. Examples: "Ready?", "${name}. — what's the ask?", "Talk to me." Do NOT use markdown, emojis, or special characters. Just the greeting text.`;
      } else if (style === 'professional') {
        prompt = `Generate a brief professional greeting for ${name}. Maximum 4-5 words. Be direct and professional. Examples: "Ready to build, ${name}?", "What's the priority, ${name}?", "Where should we start?" Do NOT use markdown, emojis, or special characters. Just the greeting text.`;
      } else {
        // Casual style
        prompt = `Generate a brief casual greeting for ${name}. Maximum 4-5 words. Be friendly and energetic. Examples: "${name}'s back — what's cooking?", "hey ${name}. — ready to build?", "yo, ${name}. — let's ship something." Do NOT use markdown, emojis, or special characters. Just the greeting text.`;
      }
      
      // Generate greeting using the specified model
      let fullResponse = '';
      await sendMessageToLLM(
        modelId,
        [], // no history
        prompt,
        [], // no files
        (chunk) => {
          fullResponse += chunk;
        },
        [] // no sources
      );
      
      if (fullResponse && fullResponse.trim()) {
        // Clean up and enforce strict length limit
        let cleaned = fullResponse.trim()
          .replace(/\*\*/g, '') // Remove bold
          .replace(/\*/g, '')   // Remove italics
          .replace(/^#+\s/gm, '') // Remove headers
          .replace(/`/g, '')    // Remove code formatting
          .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII (emojis)
          .split('\n')[0]       // Take only first line
          .slice(0, 50);        // Hard cap at 50 chars (roughly 4-5 words)
        
        // Fix capitalization: capitalize first letter and proper names
        cleaned = cleaned
          .split(' ')
          .map((word, index) => {
            // First word should be capitalized
            if (index === 0) {
              return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }
            // Capitalize names (words that are all caps or start with capital)
            if (word.length > 1 && (word === word.toUpperCase() || /^[A-Z]/.test(word))) {
              return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }
            return word.toLowerCase();
          })
          .join(' ');
        
        console.log('[Greeting] Successfully generated ultra-short AI greeting:', cleaned);
        return cleaned;
      }
      
      return null;
    } catch (error) {
      console.error('Error generating AI greeting:', error);
      return null;
    }
  }
}

export const greetingService = new GreetingService();
