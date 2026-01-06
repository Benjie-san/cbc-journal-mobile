import * as SQLite from "expo-sqlite";
import { JournalEntry } from "../types/Journal";

type LocalJournalRow = {
  local_id: string;
  server_id: string | null;
  title: string | null;
  scripture_ref: string | null;
  passage_ref: string | null;
  content_json: string | null;
  tags_json: string | null;
  deleted: number;
  version: number | null;
  sync_status: string | null;
  last_saved_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type LocalPlanDay = {
  year: number;
  month: string;
  date: number;
  order: number;
  verse: string;
  isSermonNotes: boolean;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync("journal.db");
  }
  return dbPromise;
}

export async function initDb() {
  const db = await getDb();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS journals (
      local_id TEXT PRIMARY KEY,
      server_id TEXT,
      title TEXT,
      scripture_ref TEXT,
      passage_ref TEXT,
      content_json TEXT,
      tags_json TEXT,
      deleted INTEGER DEFAULT 0,
      version INTEGER DEFAULT 1,
      sync_status TEXT,
      last_saved_at TEXT,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_journals_server_id ON journals(server_id);
    CREATE INDEX IF NOT EXISTS idx_journals_deleted ON journals(deleted);
    CREATE TABLE IF NOT EXISTS plan_days (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      month TEXT NOT NULL,
      date INTEGER NOT NULL,
      order_num INTEGER NOT NULL,
      verse TEXT NOT NULL,
      is_sermon_notes INTEGER DEFAULT 0,
      UNIQUE(year, month, date)
    );
  `);
  const columns = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(journals)"
  );
  const hasPassageRef = columns.some((col) => col.name === "passage_ref");
  if (!hasPassageRef) {
    await db.execAsync("ALTER TABLE journals ADD COLUMN passage_ref TEXT");
  }
}

function mapRowToEntry(row: LocalJournalRow): JournalEntry {
  const content = row.content_json
    ? JSON.parse(row.content_json)
    : { question: "", observation: "", application: "", prayer: "" };
  const tags = row.tags_json ? JSON.parse(row.tags_json) : [];
  const id = row.server_id ?? row.local_id;

  return {
    _id: id,
    localId: row.local_id,
    serverId: row.server_id ?? undefined,
    title: row.title ?? "",
    scriptureRef: row.scripture_ref ?? undefined,
    passageRef: row.passage_ref ?? undefined,
    content,
    tags,
    deleted: row.deleted === 1,
    version: row.version ?? 1,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
    lastSavedAt: row.last_saved_at ?? undefined,
    syncStatus: row.sync_status ?? "synced",
  };
}

export async function getLocalJournals(deleted = false): Promise<JournalEntry[]> {
  await initDb();
  const db = await getDb();
  const rows = await db.getAllAsync<LocalJournalRow>(
    "SELECT * FROM journals WHERE deleted = ? ORDER BY created_at DESC",
    [deleted ? 1 : 0]
  );
  return rows.map(mapRowToEntry);
}

export async function upsertJournalFromServer(entry: JournalEntry) {
  await initDb();
  const db = await getDb();
  const contentJson = JSON.stringify(entry.content ?? {});
  const tagsJson = JSON.stringify(entry.tags ?? []);

  const existing = await db.getFirstAsync<LocalJournalRow>(
    "SELECT * FROM journals WHERE server_id = ?",
    [entry._id]
  );

  const localId = existing?.local_id ?? entry._id;
  const passageRef = existing?.passage_ref ?? null;

  await db.runAsync(
    `INSERT INTO journals (
      local_id, server_id, title, scripture_ref, passage_ref, content_json, tags_json,
      deleted, version, sync_status, last_saved_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(local_id) DO UPDATE SET
      server_id=excluded.server_id,
      title=excluded.title,
      scripture_ref=excluded.scripture_ref,
      passage_ref=excluded.passage_ref,
      content_json=excluded.content_json,
      tags_json=excluded.tags_json,
      deleted=excluded.deleted,
      version=excluded.version,
      sync_status=excluded.sync_status,
      last_saved_at=excluded.last_saved_at,
      created_at=excluded.created_at,
      updated_at=excluded.updated_at
    `,
    [
      localId,
      entry._id,
      entry.title ?? "",
      entry.scriptureRef ?? null,
      passageRef,
      contentJson,
      tagsJson,
      entry.deleted ? 1 : 0,
      entry.version ?? 1,
      "synced",
      entry.lastSavedAt ?? entry.updatedAt ?? null,
      entry.createdAt ?? null,
      entry.updatedAt ?? null,
    ]
  );
}

export async function createLocalJournal(payload: Partial<JournalEntry>) {
  await initDb();
  const db = await getDb();
  const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const contentJson = JSON.stringify(payload.content ?? {});
  const tagsJson = JSON.stringify(payload.tags ?? []);

  await db.runAsync(
    `INSERT INTO journals (
      local_id, server_id, title, scripture_ref, passage_ref, content_json, tags_json,
      deleted, version, sync_status, last_saved_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      localId,
      null,
      payload.title ?? "",
      payload.scriptureRef ?? null,
      payload.passageRef ?? null,
      contentJson,
      tagsJson,
      payload.deleted ? 1 : 0,
      payload.version ?? 1,
      "pending_create",
      now,
      now,
      now,
    ]
  );

  return {
    _id: localId,
    localId,
    serverId: undefined,
    title: payload.title ?? "",
    scriptureRef: payload.scriptureRef,
    passageRef: payload.passageRef,
    content: (payload.content ?? {
      question: "",
      observation: "",
      application: "",
      prayer: "",
    }) as JournalEntry["content"],
    tags: payload.tags ?? [],
    deleted: payload.deleted ?? false,
    version: payload.version ?? 1,
    createdAt: now,
    updatedAt: now,
    lastSavedAt: now,
    syncStatus: "pending_create",
  } satisfies JournalEntry;
}

export async function updateLocalJournal(
  localId: string,
  payload: Partial<JournalEntry>,
  syncStatus: string
) {
  await initDb();
  const db = await getDb();
  const now = new Date().toISOString();
  const contentJson = JSON.stringify(payload.content ?? {});
  const tagsJson = JSON.stringify(payload.tags ?? []);

  await db.runAsync(
    `UPDATE journals SET
      title = ?,
      scripture_ref = ?,
      passage_ref = ?,
      content_json = ?,
      tags_json = ?,
      deleted = ?,
      version = ?,
      sync_status = ?,
      last_saved_at = ?,
      updated_at = ?
    WHERE local_id = ?`,
    [
      payload.title ?? "",
      payload.scriptureRef ?? null,
      payload.passageRef ?? null,
      contentJson,
      tagsJson,
      payload.deleted ? 1 : 0,
      payload.version ?? 1,
      syncStatus,
      now,
      now,
      localId,
    ]
  );
}

export async function updateLocalJournalPassageRef(
  localId: string,
  passageRef: string
) {
  await initDb();
  const db = await getDb();
  await db.runAsync(
    "UPDATE journals SET passage_ref = ? WHERE local_id = ?",
    [passageRef || null, localId]
  );
}

export async function updateLocalJournalMeta(
  localId: string,
  fields: {
    serverId?: string | null;
    syncStatus?: string;
    version?: number;
    deleted?: boolean;
    createdAt?: string;
    updatedAt?: string;
    lastSavedAt?: string;
  }
) {
  await initDb();
  const db = await getDb();
  const sets: string[] = [];
  const values: any[] = [];

  if (fields.serverId !== undefined) {
    sets.push("server_id = ?");
    values.push(fields.serverId);
  }
  if (fields.syncStatus !== undefined) {
    sets.push("sync_status = ?");
    values.push(fields.syncStatus);
  }
  if (fields.version !== undefined) {
    sets.push("version = ?");
    values.push(fields.version);
  }
  if (fields.deleted !== undefined) {
    sets.push("deleted = ?");
    values.push(fields.deleted ? 1 : 0);
  }
  if (fields.createdAt !== undefined) {
    sets.push("created_at = ?");
    values.push(fields.createdAt);
  }
  if (fields.updatedAt !== undefined) {
    sets.push("updated_at = ?");
    values.push(fields.updatedAt);
  }
  if (fields.lastSavedAt !== undefined) {
    sets.push("last_saved_at = ?");
    values.push(fields.lastSavedAt);
  }

  if (!sets.length) return;

  values.push(localId);
  await db.runAsync(
    `UPDATE journals SET ${sets.join(", ")} WHERE local_id = ?`,
    values
  );
}

export async function deleteLocalJournal(localId: string) {
  await initDb();
  const db = await getDb();
  await db.runAsync("DELETE FROM journals WHERE local_id = ?", [localId]);
}

export async function getPendingLocalJournals() {
  await initDb();
  const db = await getDb();
  const rows = await db.getAllAsync<LocalJournalRow>(
    "SELECT * FROM journals WHERE sync_status IS NOT NULL AND sync_status != ?",
    ["synced"]
  );
  return rows.map(mapRowToEntry);
}

export async function savePlanDays(days: LocalPlanDay[]) {
  if (!days.length) return;
  await initDb();
  const db = await getDb();
  await db.execAsync("BEGIN TRANSACTION");
  try {
    for (const day of days) {
      await db.runAsync(
        `INSERT INTO plan_days (year, month, date, order_num, verse, is_sermon_notes)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(year, month, date) DO UPDATE SET
           order_num=excluded.order_num,
           verse=excluded.verse,
           is_sermon_notes=excluded.is_sermon_notes`,
        [
          day.year,
          day.month,
          day.date,
          day.order,
          day.verse,
          day.isSermonNotes ? 1 : 0,
        ]
      );
    }
    await db.execAsync("COMMIT");
  } catch (err) {
    await db.execAsync("ROLLBACK");
    throw err;
  }
}

export async function getPlanDaysByYear(year: number): Promise<LocalPlanDay[]> {
  await initDb();
  const db = await getDb();
  const rows = await db.getAllAsync<{
    year: number;
    month: string;
    date: number;
    order_num: number;
    verse: string;
    is_sermon_notes: number;
  }>(
    "SELECT year, month, date, order_num, verse, is_sermon_notes FROM plan_days WHERE year = ?",
    [year]
  );
  return rows.map((row) => ({
    year: row.year,
    month: row.month,
    date: row.date,
    order: row.order_num,
    verse: row.verse,
    isSermonNotes: row.is_sermon_notes === 1,
  }));
}

export async function clearLocalJournals() {
  await initDb();
  const db = await getDb();
  await db.runAsync("DELETE FROM journals");
}
