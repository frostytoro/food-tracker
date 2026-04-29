export class CooldownManager {
  private readonly lastSeen = new Map<string, number>();

  constructor(private readonly cooldownMs: number) {}

  canProceed(userId: string): boolean {
    const now = Date.now();
    const lastTime = this.lastSeen.get(userId);

    if (lastTime && now - lastTime < this.cooldownMs) {
      return false;
    }

    this.lastSeen.set(userId, now);
    return true;
  }
}

