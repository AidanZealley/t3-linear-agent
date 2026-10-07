import { DatabaseSync } from "node:sqlite";
import { mkdirSync, lstatSync, openSync, closeSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { eventSchema, type AgentEvent } from "../linear/events.ts";
import type { Session, Intent, Report } from "../sessions/types.ts";

export type Installation = {
  workspaceId: string; appUserId: string; clientId: string;
  accessToken: string; refreshToken: string; expiresAt: number; scope: string;
};
export type Receipt = { sequence: number; deliveryId: string; event: AgentEvent };
export type InitialActivity = { sessionId: string; activityId: string; attempts: number };
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export function privateFile(path: string) {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077)) throw new Error("Expected private regular file");
}
export class Store {
  private db: DatabaseSync;
  constructor(path: string) {
    path = resolve(path);
    if (path.startsWith(`${resolve(".")}/`)) throw new Error("Store must be outside the checkout");
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    const directory = lstatSync(dirname(path));
    if (!directory.isDirectory() || directory.isSymbolicLink() || (directory.mode & 0o077)) throw new Error("Store directory must be private");
    try { closeSync(openSync(path, "wx", 0o600)); } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
    }
    privateFile(path);
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS installation (id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS oauth_state (hash TEXT PRIMARY KEY, verifier TEXT NOT NULL, expires_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS receipts (sequence INTEGER PRIMARY KEY AUTOINCREMENT, delivery_id TEXT UNIQUE NOT NULL, event TEXT NOT NULL, consumed INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS initial_activities (session_id TEXT PRIMARY KEY, activity_id TEXT UNIQUE NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, next_at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending');
      CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS intents (id TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, value TEXT NOT NULL);`);
  }
  close() { this.db.close(); }
  installation(): Installation | undefined {
    const row = this.db.prepare("SELECT value FROM installation WHERE id=1").get();
    return row ? JSON.parse(String(row.value)) as Installation : undefined;
  }
  saveInstallation(value: Installation) {
    const current = this.installation();
    if (current && (current.workspaceId !== value.workspaceId || current.appUserId !== value.appUserId || current.clientId !== value.clientId)) throw new Error("Installation identity cannot change");
    this.db.prepare("INSERT INTO installation VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET value=excluded.value").run(JSON.stringify(value));
  }
  saveState(state: string, verifier: string, now = Date.now()) {
    this.db.prepare("DELETE FROM oauth_state WHERE expires_at < ?").run(now);
    this.db.prepare("INSERT INTO oauth_state VALUES (?, ?, ?)").run(hash(state), verifier, now + 600_000);
  }
  consumeState(state: string, now = Date.now()) {
    const row = this.db.prepare("DELETE FROM oauth_state WHERE hash=? RETURNING verifier, expires_at").get(hash(state));
    if (!row || Number(row.expires_at) < now) throw new Error("Invalid OAuth state");
    return String(row.verifier);
  }
  receive(deliveryId: string, event: AgentEvent, now = Date.now()) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const inserted = this.db.prepare("INSERT OR IGNORE INTO receipts(delivery_id,event) VALUES (?,?)").run(deliveryId, JSON.stringify(event)).changes > 0;
      if (inserted && event.action === "created") this.db.prepare("INSERT OR IGNORE INTO initial_activities(session_id,activity_id,next_at) VALUES (?,?,?)").run(event.agentSession.id, randomUUID(), now);
      this.db.exec("COMMIT");
      return inserted;
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  pendingEvents(): Receipt[] {
    return this.db.prepare("SELECT sequence,delivery_id,event FROM receipts WHERE consumed=0 ORDER BY sequence").all().map(row => ({ sequence: Number(row.sequence), deliveryId: String(row.delivery_id), event: eventSchema.parse(JSON.parse(String(row.event))) }));
  }
  consumeEvent(sequence: number) { this.db.prepare("UPDATE receipts SET consumed=1 WHERE sequence=?").run(sequence); }
  dueActivities(now = Date.now()): InitialActivity[] {
    return this.db.prepare("SELECT session_id,activity_id,attempts FROM initial_activities WHERE status='pending' AND next_at<=? ORDER BY next_at").all(now).map(row => ({ sessionId: String(row.session_id), activityId: String(row.activity_id), attempts: Number(row.attempts) }));
  }
  activitySent(id: string) { this.db.prepare("UPDATE initial_activities SET status='sent' WHERE activity_id=?").run(id); }
  initialActivityStatus(sessionId: string) {
    const row = this.db.prepare("SELECT status FROM initial_activities WHERE session_id=?").get(sessionId);
    return row ? String(row.status) : undefined;
  }
  activityFailed(id: string, attempts: number, now = Date.now()) {
    this.db.prepare("UPDATE initial_activities SET attempts=?,next_at=?,status=? WHERE activity_id=?").run(attempts, now + Math.min(60_000, 1000 * 2 ** (attempts - 1)), attempts >= 6 ? "failed" : "pending", id);
  }
  retryFailedActivities() { this.db.prepare("UPDATE initial_activities SET status='pending',attempts=0,next_at=0 WHERE status='failed'").run(); }
  // Lifecycle updates and receipt consumption share a transaction. A crash cannot lose input.
  transaction<T>(update: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try { const result = update(); this.db.exec("COMMIT"); return result; }
    catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  sessions(): Session[] { return this.db.prepare("SELECT value FROM sessions").all().map(row => JSON.parse(String(row.value)) as Session).sort((a, b) => a.order - b.order); }
  saveSession(value: Session) { this.db.prepare("INSERT INTO sessions VALUES (?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value").run(value.id, JSON.stringify(value)); }
  intents(): Intent[] { return this.db.prepare("SELECT value FROM intents").all().map(row => JSON.parse(String(row.value)) as Intent); }
  saveIntent(value: Intent) { this.db.prepare("INSERT INTO intents VALUES (?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value").run(value.id, JSON.stringify(value)); }
  reports(): Report[] { return this.db.prepare("SELECT value FROM reports ORDER BY rowid").all().map(row => JSON.parse(String(row.value)) as Report); }
  saveReport(value: Report) { this.db.prepare("INSERT INTO reports VALUES (?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value").run(value.id, JSON.stringify(value)); }
  retryReports() { for (const report of this.reports().filter(item => item.status === "failed")) this.saveReport({ ...report, status: "pending", attempts: 0, nextAt: 0 }); }
}
