import { create } from "zustand";
import { apiGet, apiPost, apiPut, apiDelete } from "../api/client";
import { auth } from "../firebase/config";
import { JournalEntry } from "../types/Journal";
import {
    createLocalJournal,
    deleteLocalJournal,
    getLocalJournals,
    getPendingLocalJournals,
    initDb,
    updateLocalJournal,
    updateLocalJournalPassageRef,
    updateLocalJournalMeta,
    upsertJournalFromServer,
} from "../db/localDb";
import { useStreakStore } from "./streakStore";
import { getSecureItem, setSecureItem } from "../storage/secureStorage";

let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
const SYNC_TIMEOUT_MS = 2500;
const AUTH_TIMEOUT_MS = 2500;

type JournalConflict = {
    id: string;
    serverVersion: number;
    serverEntry: {
        title?: string;
        scriptureRef?: string;
        content: JournalEntry["content"];
        tags?: string[];
        updatedAt?: string;
        createdAt?: string;
    };
    clientPayload: Partial<JournalEntry>;
};

interface JournalStore {
    journals: JournalEntry[];
    trash: JournalEntry[];
    saving: boolean;
    conflict: JournalConflict | null;
    syncing: boolean;
    lastSyncAt?: string;
    isOnline: boolean;
    syncError?: string | null;

    loadJournals: () => Promise<void>;
    loadTrash: () => Promise<void>;
    createJournal: (payload: Partial<JournalEntry>) => Promise<JournalEntry>;
    updateJournal: (id: string, payload: Partial<JournalEntry>) => Promise<boolean>;
    autosaveJournal: (id: string, payload: Partial<JournalEntry>, delay?:number) => void;
    updatePassageRef: (id: string, passageRef: string) => Promise<void>;
    softDelete: (id: string) => Promise<void>;
    restore: (id: string) => Promise<void>;
    permanentDelete: (id: string) => Promise<void>;
    clearConflict: () => void;
    applyServerEntry: (id: string, serverEntry: JournalConflict["serverEntry"], serverVersion: number) => void;
    resolveConflictKeepMine: (id: string, payload: Partial<JournalEntry>, serverVersion: number) => Promise<void>;
    replaceJournal: (entry: JournalEntry) => void;
    syncJournals: () => Promise<void>;
    reset: () => void;
}

const getOrCreateBackendToken = async () => {
    let token = await getSecureItem("backendToken");
    if (token) return token;
    const user = auth.currentUser;
    if (!user) return null;
    const idToken = await user.getIdToken(true);
    const data = await apiPost("/auth", { idToken }, false, AUTH_TIMEOUT_MS);
    token = data?.token ?? null;
    if (token) {
        await setSecureItem("backendToken", token);
    }
    return token;
};

export const useJournalStore = create<JournalStore>((set, get) => ({
    journals: [],
    trash: [],
    saving: false,
    conflict: null,
    syncing: false,
    lastSyncAt: undefined,
    isOnline: true,
    syncError: null,

    loadJournals: async () => {
        try {
            await initDb();
            const local = await getLocalJournals(false);
            set({ journals: local });
            await useStreakStore.getState().recalculateFromEntries(local);
        } catch (err) {
            console.error("Failed to load local journals:", err);
            set({ journals: [] });
        }
    },

    loadTrash: async () => {
        try {
            await initDb();
            const local = await getLocalJournals(true);
            set({ trash: local });
        } catch (err) {
            console.error("Failed to load local trash:", err);
            set({ trash: [] });
        }
    },

    createJournal: async (payload) => {
        const entry = await createLocalJournal(payload);
        set({ journals: [entry, ...get().journals] });
        await useStreakStore.getState().recordEntry(entry.createdAt);

        try {
            await get().syncJournals();
        } catch (err) {
            // sync is manual; ignore immediate failure
        }

        return entry;
    },

    updateJournal: async (id, payload) => {
        const journal = get().journals.find(j =>
            j._id === id || j.localId === id
        );
        if (!journal) return false;

        const localId = journal.localId ?? journal._id;
        const next: JournalEntry = {
            ...journal,
            ...payload,
            content: payload.content ?? journal.content,
            tags: payload.tags ?? journal.tags,
            title: payload.title ?? journal.title,
            scriptureRef: payload.scriptureRef ?? journal.scriptureRef,
            passageRef: payload.passageRef ?? journal.passageRef,
            updatedAt: new Date().toISOString(),
            lastSavedAt: new Date().toISOString(),
        };

        const nextSyncStatus =
            journal.syncStatus === "conflict"
                ? "conflict"
                : journal.serverId
                ? "pending_update"
                : "pending_create";

        set({ saving: true });
        await updateLocalJournal(
            localId,
            {
                title: next.title,
                scriptureRef: next.scriptureRef,
                passageRef: next.passageRef,
                tags: next.tags,
                content: next.content,
                deleted: journal.deleted,
                version: journal.version,
            },
            nextSyncStatus
        );

        set({
            journals: get().journals.map(j =>
                j._id === journal._id ? { ...next, syncStatus: nextSyncStatus } : j
            ),
            saving: false,
        });
        return true;
    },

    autosaveJournal: (id, payload, delay = 1200) => {
        if (autosaveTimer) {
            clearTimeout(autosaveTimer);
        }

        autosaveTimer = setTimeout(async () => {
        try {
            if (get().conflict?.id === id) return;
            await get().updateJournal(id, payload);
        } catch (err) {
            console.error("Autosave failed:", err);
        }
        }, delay);
    },
    updatePassageRef: async (id, passageRef) => {
        const journal = get().journals.find(j => j._id === id || j.localId === id);
        if (!journal) return;
        const localId = journal.localId ?? journal._id;
        await updateLocalJournalPassageRef(localId, passageRef);
        set({
            journals: get().journals.map(j =>
                j._id === journal._id ? { ...j, passageRef } : j
            ),
        });
    },

    softDelete: async (id) => {
        const journal = get().journals.find(j =>
            j._id === id || j.localId === id
        );
        if (!journal) return;
        const localId = journal.localId ?? journal._id;
        const nextSyncStatus = journal.serverId ? "pending_delete" : journal.syncStatus ?? "pending_create";
        await updateLocalJournal(
            localId,
            {
                title: journal.title,
                scriptureRef: journal.scriptureRef,
                passageRef: journal.passageRef,
                tags: journal.tags,
                content: journal.content,
                deleted: true,
                version: journal.version,
            },
            nextSyncStatus
        );
        const next = { ...journal, deleted: true, syncStatus: nextSyncStatus };
        set({
            journals: get().journals.filter(j => j._id !== journal._id),
            trash: [next, ...get().trash],
        });
    },

    restore: async (id) => {
        const journal = get().trash.find(j =>
            j._id === id || j.localId === id
        );
        if (!journal) return;
        const localId = journal.localId ?? journal._id;
        const nextSyncStatus = journal.serverId ? "pending_restore" : "pending_create";
        await updateLocalJournal(
            localId,
            {
                title: journal.title,
                scriptureRef: journal.scriptureRef,
                passageRef: journal.passageRef,
                tags: journal.tags,
                content: journal.content,
                deleted: false,
                version: journal.version,
            },
            nextSyncStatus
        );
        const next = { ...journal, deleted: false, syncStatus: nextSyncStatus };
        set({
            trash: get().trash.filter(j => j._id !== journal._id),
            journals: [next, ...get().journals],
        });
    },

    permanentDelete: async (id) => {
        const journal = get().trash.find(j =>
            j._id === id || j.localId === id
        );
        if (!journal) return;
        const localId = journal.localId ?? journal._id;
        if (!journal.serverId) {
            await deleteLocalJournal(localId);
            set({
                trash: get().trash.filter(j => j._id !== journal._id),
            });
            return;
        }
        await updateLocalJournalMeta(localId, {
            syncStatus: "pending_permanent_delete",
        });
        set({
            trash: get().trash.filter(j => j._id !== journal._id),
        });
    },
    clearConflict: () => set({ conflict: null }),
    applyServerEntry: (id, serverEntry, serverVersion) => {
        const journal = get().journals.find(j => j._id === id || j.localId === id);
        if (!journal) return;
        const localId = journal.localId ?? journal._id;
        updateLocalJournal(
            localId,
            {
                title: serverEntry.title ?? journal.title,
                scriptureRef: serverEntry.scriptureRef ?? journal.scriptureRef,
                passageRef: journal.passageRef,
                tags: serverEntry.tags ?? journal.tags,
                content: serverEntry.content ?? journal.content,
                deleted: journal.deleted,
                version: serverVersion,
            },
            "synced"
        ).catch(() => {});
        set({
            conflict: null,
            journals: get().journals.map(j =>
                j._id === journal._id
                ? {
                    ...j,
                    title: serverEntry.title ?? j.title,
                    scriptureRef: serverEntry.scriptureRef ?? j.scriptureRef,
                    content: serverEntry.content ?? j.content,
                    tags: serverEntry.tags ?? j.tags,
                    version: serverVersion,
                    updatedAt: serverEntry.updatedAt ?? j.updatedAt,
                    createdAt: serverEntry.createdAt ?? j.createdAt,
                    syncStatus: "synced",
                }
                : j
            ),
        });
    },
    resolveConflictKeepMine: async (id, payload, serverVersion) => {
        set({ saving: true });
        try {
            const updated = await apiPut(`/journals/${id}`, {
                ...payload,
                baseVersion: serverVersion,
            });
            await upsertJournalFromServer(updated);
            set({
                journals: get().journals.map(j =>
                j._id === id ? { ...updated, passageRef: j.passageRef } : j
                ),
                saving: false,
                conflict: null,
            });
        } catch (err) {
            set({ saving: false });
            throw err;
        }
    },
    replaceJournal: (entry) => {
        upsertJournalFromServer(entry).catch(() => {});
        set({
            journals: get().journals.map(j =>
                j._id === entry._id ? { ...entry, passageRef: j.passageRef } : j
            ),
        });
    },
    syncJournals: async () => {
        if (get().syncing) return;
        set({ syncing: true, syncError: null });
        try {
            const token = await getOrCreateBackendToken();
            if (!token) {
                set({ syncing: false, isOnline: false, syncError: "Missing token" });
                return;
            }

            const pending = await getPendingLocalJournals();
            const conflictIds = new Set<string>();

            for (const entry of pending) {
                const localId = entry.localId ?? entry._id;
                const serverId = entry.serverId;
                const basePayload = {
                    title: entry.title,
                    scriptureRef: entry.scriptureRef,
                    content: entry.content,
                    tags: entry.tags ?? [],
                };
                const clientId = entry.localId ?? entry._id;
                const createPayload = { ...basePayload, clientId };

                if (entry.syncStatus === "pending_create") {
                    if (entry.deleted && !serverId) {
                        await updateLocalJournalMeta(localId, { syncStatus: "synced" });
                        continue;
                    }
                    const created = await apiPost(
                        "/journals",
                        createPayload,
                        true,
                        SYNC_TIMEOUT_MS
                    );
                    await updateLocalJournal(
                        localId,
                        {
                            title: created.title,
                            scriptureRef: created.scriptureRef,
                            passageRef: entry.passageRef,
                            tags: created.tags,
                            content: created.content,
                            deleted: created.deleted,
                            version: created.version,
                        },
                        "synced"
                    );
                    await updateLocalJournalMeta(localId, {
                        serverId: created._id,
                        createdAt: created.createdAt,
                        updatedAt: created.updatedAt,
                        lastSavedAt: created.updatedAt ?? created.createdAt,
                    });
                    continue;
                }

                if (entry.syncStatus === "pending_update") {
                    if (!serverId) {
                        const created = await apiPost(
                            "/journals",
                            createPayload,
                            true,
                            SYNC_TIMEOUT_MS
                        );
                        await updateLocalJournal(
                            localId,
                            {
                                title: created.title,
                                scriptureRef: created.scriptureRef,
                                passageRef: entry.passageRef,
                                tags: created.tags,
                                content: created.content,
                                deleted: created.deleted,
                                version: created.version,
                            },
                            "synced"
                        );
                        await updateLocalJournalMeta(localId, {
                            serverId: created._id,
                            createdAt: created.createdAt,
                            updatedAt: created.updatedAt,
                            lastSavedAt: created.updatedAt ?? created.createdAt,
                        });
                        continue;
                    }
                    try {
                        const updated = await apiPut(
                            `/journals/${serverId}`,
                            {
                            ...basePayload,
                            baseVersion: entry.version,
                            },
                            true,
                            SYNC_TIMEOUT_MS
                        );
                        await upsertJournalFromServer(updated);
                    } catch (err: any) {
                        if (err?.status === 409 && err?.data?.error === "VERSION_CONFLICT") {
                            await updateLocalJournalMeta(localId, { syncStatus: "conflict" });
                            if (serverId) {
                                conflictIds.add(serverId);
                            }
                            set({
                                conflict: {
                                    id: entry._id,
                                    serverVersion: err.data.serverVersion,
                                    serverEntry: err.data.serverEntry,
                                    clientPayload: payload,
                                },
                            });
                            continue;
                        }
                        throw err;
                    }
                    continue;
                }

                if (entry.syncStatus === "pending_delete") {
                    if (!serverId) {
                        await updateLocalJournalMeta(localId, { syncStatus: "synced" });
                        continue;
                    }
                    await apiDelete(`/journals/${serverId}`, true, SYNC_TIMEOUT_MS);
                    await updateLocalJournalMeta(localId, { syncStatus: "synced", deleted: true });
                    continue;
                }

                if (entry.syncStatus === "pending_restore") {
                    if (!serverId) {
                        await updateLocalJournalMeta(localId, { syncStatus: "pending_create" });
                        continue;
                    }
                    const restored = await apiPost(
                        `/journals/${serverId}/restore`,
                        {},
                        true,
                        SYNC_TIMEOUT_MS
                    );
                    await upsertJournalFromServer(restored);
                    continue;
                }

                if (entry.syncStatus === "pending_permanent_delete") {
                    if (!serverId) {
                        await deleteLocalJournal(localId);
                        continue;
                    }
                    await apiDelete(
                        `/journals/${serverId}/permanent`,
                        true,
                        SYNC_TIMEOUT_MS
                    );
                    await deleteLocalJournal(localId);
                }
            }

            const active = await apiGet("/journals", true, SYNC_TIMEOUT_MS);
            const deleted = await apiGet("/journals/trash", true, SYNC_TIMEOUT_MS);
            for (const entry of [...active, ...deleted]) {
                if (conflictIds.has(entry._id)) continue;
                await upsertJournalFromServer(entry);
            }

            const localActive = await getLocalJournals(false);
            const localTrash = await getLocalJournals(true);
            set({
                journals: localActive,
                trash: localTrash,
                syncing: false,
                lastSyncAt: new Date().toISOString(),
                isOnline: true,
            });
            await useStreakStore.getState().recalculateFromEntries(localActive);
        } catch (err: any) {
            const message = err?.message ?? "Sync failed";
            set({
                syncing: false,
                syncError: message,
                isOnline: false,
            });
        }
    },
    reset: () => {
        if (autosaveTimer) {
            clearTimeout(autosaveTimer);
            autosaveTimer = null;
        }
        set({
            journals: [],
            trash: [],
            saving: false,
            conflict: null,
            syncing: false,
            lastSyncAt: undefined,
            isOnline: true,
            syncError: null,
        });
    },
    
}));
