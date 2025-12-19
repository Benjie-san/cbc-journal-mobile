import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiGet, apiPost, apiPut, apiDelete } from "../api/client";
import { JournalEntry } from "../types/Journal";

let autosaveTimer: ReturnType<typeof setTimeout> | null = null;

interface JournalStore {
    journals: JournalEntry[];
    trash: JournalEntry[];
    saving: boolean;

    loadJournals: () => Promise<void>;
    loadTrash: () => Promise<void>;
    createJournal: (payload: Partial<JournalEntry>) => Promise<JournalEntry>;
    updateJournal: (id: string, payload: Partial<JournalEntry>) => Promise<void>;
    autosaveJournal: (id: string, payload: Partial<JournalEntry>, delay?:number) => void;
    softDelete: (id: string) => Promise<void>;
    restore: (id: string) => Promise<void>;
    permanentDelete: (id: string) => Promise<void>;
    reset: () => void;
}

export const useJournalStore = create<JournalStore>((set, get) => ({
    journals: [],
    trash: [],
    saving: false,

    loadJournals: async () => {
        const token = await AsyncStorage.getItem("backendToken");
        if (!token) {
            set({ journals: [] });
            return;
        }
        const data = await apiGet("/journals");
        set({ journals: data });
    },

    loadTrash: async () => {
    const token = await AsyncStorage.getItem("backendToken");
    if (!token) {
        set({ trash: [] });
        return;
    }
    const data = await apiGet("/journals/trash");
    set({ trash: data });
    },

    createJournal: async (payload) => {
        const entry = await apiPost("/journals", payload);
        set({ journals: [entry, ...get().journals] });
        return entry;
    },

    updateJournal: async (id, payload) => {
        const journal = get().journals.find(j => j._id === id);
        if (!journal) return;

        set({ saving: true });

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
    },

    autosaveJournal: (id, payload, delay = 1200) => {
        if (autosaveTimer) {
            clearTimeout(autosaveTimer);
        }

        autosaveTimer = setTimeout(async () => {
        try {
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
    reset: () => set({ journals: [], trash: [], saving: false }),
    
}));
