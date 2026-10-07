import type { InitialActivity, Store } from "../store/index.ts";

export class InitialActivityWorker {
  private inFlight = new Map<string, Promise<void>>();
  private timer?: ReturnType<typeof setInterval>;
  private store: Store;
  private send: (sessionId: string, activityId: string) => Promise<void>;
  constructor(store: Store, send: (sessionId: string, activityId: string) => Promise<void>) { this.store = store; this.send = send; }
  async flush(now = Date.now()) {
    for (const activity of this.store.dueActivities(now)) {
      if (this.inFlight.has(activity.activityId)) continue;
      const delivery = this.deliver(activity).finally(() => { this.inFlight.delete(activity.activityId); });
      this.inFlight.set(activity.activityId, delivery);
    }
    await Promise.all(this.inFlight.values());
  }
  private async deliver(activity: InitialActivity) {
    try { await this.send(activity.sessionId, activity.activityId); this.store.activitySent(activity.activityId); }
    catch { this.store.activityFailed(activity.activityId, activity.attempts + 1); }
  }
  start() { this.timer ??= setInterval(() => { void this.flush().catch(() => {}); }, 250); void this.flush().catch(() => {}); }
  async stop() { clearInterval(this.timer); this.timer = undefined; await Promise.all(this.inFlight.values()); }
}
