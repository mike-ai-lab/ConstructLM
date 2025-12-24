import { UserProfile, userProfileService } from './userProfileService';

class GreetingService {
  private getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  private getTimeGreeting(profile: UserProfile | null): string {
    const timeOfDay = this.getTimeOfDay();
    const style = profile?.greetingStyle || 'casual';
    
    if (style === 'minimal') return 'Hey';
    if (style === 'professional') {
      return `Good ${timeOfDay}`;
    }
    // casual
    const greetings = {
      morning: ['Good morning', 'Morning', 'Hey there'],
      afternoon: ['Good afternoon', 'Hey', 'Hi'],
      evening: ['Good evening', 'Evening', 'Hey']
    };
    const options = greetings[timeOfDay as keyof typeof greetings];
    return options[Math.floor(Math.random() * options.length)];
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

  generateGreeting(): string {
    const profile = userProfileService.getProfile();
    const isFirstEver = userProfileService.isFirstVisit();
    const isReturning = userProfileService.isReturningUser();

    // First-ever visit - onboarding
    if (isFirstEver) {
      return 'Hello! I\'m Construct AI LM, your AI assistant.\n\nBefore we start, would you like to personalize your experience? You can set this up in Settings (⚙️) anytime.\n\nI can help you with:\n• Code development & debugging\n• Document analysis (PDF, Excel, images)\n• Architecture & design questions\n• And much more!\n\n**Tip:** Type "@" to mention files, or just drag and drop them here.';
    }

    // First visit with profile
    if (profile && !isReturning) {
      const greeting = this.getTimeGreeting(profile);
      const name = profile.name ? `, ${profile.name}` : '';
      const role = profile.role ? ` As a ${profile.role}, ` : ' ';
      
      return `${greeting}${name}! 👋 Welcome to ConstructLM.\n\n${role}I can help you with code reviews, debugging, document analysis, and more. What are we building today?`;
    }

    // Returning user - brief personalized greeting
    if (profile && isReturning) {
      const greeting = this.getTimeGreeting(profile);
      const name = profile.name ? `, ${profile.name}` : '';
      
      if (profile.greetingStyle === 'minimal') {
        return `${greeting}${name}! Ready when you are.`;
      }
      
      return `${greeting}${name}! ${this.getCapabilityHighlight()}`;
    }

    // Default fallback (no profile, but not first visit)
    return `Hey! ${this.getCapabilityHighlight()}\n\n**Tip:** Type "@" to mention files.`;
  }
}

export const greetingService = new GreetingService();
