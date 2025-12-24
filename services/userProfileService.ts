export interface UserProfile {
  name?: string;
  role?: string;
  country?: string;
  timezone?: string;
  greetingStyle?: 'professional' | 'casual' | 'minimal';
  interests?: string[];
  hasCompletedOnboarding?: boolean;
  firstVisit?: number;
  lastVisit?: number;
  sessionCount?: number;
}

class UserProfileService {
  private readonly STORAGE_KEY = 'constructlm_user_profile';

  getProfile(): UserProfile | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  }

  saveProfile(profile: UserProfile): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(profile));
    } catch (error) {
      console.error('Error saving user profile:', error);
    }
  }

  updateProfile(updates: Partial<UserProfile>): void {
    const current = this.getProfile() || {};
    this.saveProfile({ ...current, ...updates });
  }

  recordVisit(): void {
    const profile = this.getProfile() || {};
    const now = Date.now();
    this.saveProfile({
      ...profile,
      lastVisit: now,
      firstVisit: profile.firstVisit || now,
      sessionCount: (profile.sessionCount || 0) + 1
    });
  }

  isFirstVisit(): boolean {
    const profile = this.getProfile();
    return !profile || !profile.hasCompletedOnboarding;
  }

  isReturningUser(): boolean {
    const profile = this.getProfile();
    return !!profile && (profile.sessionCount || 0) > 1;
  }
}

export const userProfileService = new UserProfileService();
