class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly limits = {
    'google': { requests: 10, window: 60000 }, // 10 req/min
    'groq': { requests: 20, window: 60000 },
    'openai': { requests: 50, window: 60000 }
  };

  canMakeRequest(provider: string): { allowed: boolean; waitTime?: number } {
    const limit = this.limits[provider as keyof typeof this.limits];
    if (!limit) return { allowed: true };

    const now = Date.now();
    const requests = this.requests.get(provider) || [];
    const recentRequests = requests.filter(t => now - t < limit.window);

    if (recentRequests.length >= limit.requests) {
      const oldestRequest = Math.min(...recentRequests);
      const waitTime = Math.ceil((limit.window - (now - oldestRequest)) / 1000);
      console.warn(`[RateLimiter] ${provider}: ${recentRequests.length}/${limit.requests} requests in last minute. Wait ${waitTime}s`);
      return { allowed: false, waitTime };
    }

    recentRequests.push(now);
    this.requests.set(provider, recentRequests);
    console.log(`[RateLimiter] ${provider}: ${recentRequests.length}/${limit.requests} requests`);
    return { allowed: true };
  }

  reset(provider: string) {
    this.requests.delete(provider);
    console.log(`[RateLimiter] ${provider}: Reset`);
  }
}

export const rateLimiter = new RateLimiter();
