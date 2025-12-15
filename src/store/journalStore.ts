import { create } from "zustand";
import { apiGet, apiPost, apiPut, apiDelete } from "../api/client";
import { JournalEntry } from "../types/Journal";

interface JournalStore {
    journals: JournalEntry[];
    trash: JournalEntry[];

    loadJournals: () => Promise<void>;
    loadTrash: () => Promise<void>;
    createJournal: (payload: Partial<JournalEntry>) => Promise<void>;
    updateJournal: (id: string, payload: Partial<JournalEntry>) => Promise<void>;
    softDelete: (id: string) => Promise<void>;
    restore: (id: string) => Promise<void>;
    permanentDelete: (id: string) => Promise<void>;
}

export const useJournalStore = create<JournalStore>((set, get) => ({
    journals: [],
    trash: [],

    loadJournals: async () => {
    const data = await apiGet("/journals");
    set({ journals: data });
    },

    loadTrash: async () => {
    const data = await apiGet("/journals/trash");
    set({ trash: data });
    },

    createJournal: async (payload) => {
    const entry = await apiPost("/journals", payload);
    set({ journals: [entry, ...get().journals] });
    },

    updateJournal: async (id, payload) => {
        const updated = await apiPut(`/journals/${id}`, payload);
            set({
            journals: get().journals.map(j =>
            j._id === id ? updated : j
            ),
        });
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
    
}));
