import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiGet, apiPost, apiPut, apiDelete } from "../api/client";
import { auth } from "../firebase/config";
import { JournalEntry } from "../types/Journal";

let autosaveTimer: ReturnType<typeof setTimeout> | null = null;

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

    loadJournals: () => Promise<void>;
    loadTrash: () => Promise<void>;
    createJournal: (payload: Partial<JournalEntry>) => Promise<JournalEntry>;
    updateJournal: (id: string, payload: Partial<JournalEntry>) => Promise<boolean>;
    autosaveJournal: (id: string, payload: Partial<JournalEntry>, delay?:number) => void;
    softDelete: (id: string) => Promise<void>;
    restore: (id: string) => Promise<void>;
    permanentDelete: (id: string) => Promise<void>;
    clearConflict: () => void;
    applyServerEntry: (id: string, serverEntry: JournalConflict["serverEntry"], serverVersion: number) => void;
    resolveConflictKeepMine: (id: string, payload: Partial<JournalEntry>, serverVersion: number) => Promise<void>;
    replaceJournal: (entry: JournalEntry) => void;
    reset: () => void;
}

const getOrCreateBackendToken = async () => {
    let token = await AsyncStorage.getItem("backendToken");
    if (token) return token;
    const user = auth.currentUser;
    if (!user) return null;
    const idToken = await user.getIdToken(true);
    const data = await apiPost("/auth", { idToken }, false);
    token = data?.token ?? null;
    if (token) {
        await AsyncStorage.setItem("backendToken", token);
    }
    return token;
};

export const useJournalStore = create<JournalStore>((set, get) => ({
    journals: [],
    trash: [],
    saving: false,
    conflict: null,

    loadJournals: async () => {
        const token = await getOrCreateBackendToken();
        if (!token) {
            set({ journals: [] });
            return;
        }
        try {
            const data = await apiGet("/journals");
            set({ journals: data });
        } catch (err) {
            console.error("Failed to load journals:", err);
            set({ journals: [] });
        }
    },

    loadTrash: async () => {
    const token = await getOrCreateBackendToken();
    if (!token) {
        set({ trash: [] });
        return;
    }
    try {
        const data = await apiGet("/journals/trash");
        set({ trash: data });
    } catch (err) {
        console.error("Failed to load trash:", err);
        set({ trash: [] });
    }
    },

    createJournal: async (payload) => {
        const entry = await apiPost("/journals", payload);
        set({ journals: [entry, ...get().journals] });
        return entry;
    },

    updateJournal: async (id, payload) => {
        const journal = get().journals.find(j => j._id === id);
        if (!journal) return false;

        set({ saving: true });

        try {
            const updated = await apiPut(`/journals/${id}`, {
                ...payload,
                baseVersion: journal.version,
            });

            set({
                journals: get().journals.map(j =>
                j._id === id ? updated : j
                ),
                saving: false,
            });
            return true;
        } catch (err: any) {
            if (err?.status === 409 && err?.data?.error === "VERSION_CONFLICT") {
                set({
                    saving: false,
                    conflict: {
                        id,
                        serverVersion: err.data.serverVersion,
                        serverEntry: err.data.serverEntry,
                        clientPayload: payload,
                    },
                });
                return false;
            }
            set({ saving: false });
            throw err;
        }
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

    softDelete: async (id) => {
        await apiDelete(`/journals/${id}`);
        set({
        journals: get().journals.filter(j => j._id !== id),
        });
    },

    restore: async (id) => {
        const restored = await apiPost(`/journals/${id}/restore`, {});
        set({
        trash: get().trash.filter(j => j._id !== id),
        journals: [restored, ...get().journals],
        });
    },

    permanentDelete: async (id) => {
        await apiDelete(`/journals/${id}/permanent`);
        set({
        trash: get().trash.filter(j => j._id !== id),
        });
    },
    clearConflict: () => set({ conflict: null }),
    applyServerEntry: (id, serverEntry, serverVersion) => {
        set({
            conflict: null,
            journals: get().journals.map(j =>
                j._id === id
                ? {
                    ...j,
                    title: serverEntry.title ?? j.title,
                    scriptureRef: serverEntry.scriptureRef ?? j.scriptureRef,
                    content: serverEntry.content ?? j.content,
                    tags: serverEntry.tags ?? j.tags,
                    version: serverVersion,
                    updatedAt: serverEntry.updatedAt ?? j.updatedAt,
                    createdAt: serverEntry.createdAt ?? j.createdAt,
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
            set({
                journals: get().journals.map(j =>
                j._id === id ? updated : j
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
        set({
            journals: get().journals.map(j =>
                j._id === entry._id ? entry : j
            ),
        });
    },
    reset: () => set({ journals: [], trash: [], saving: false, conflict: null }),
    
}));
