export interface JournalContent {
    question: string;
    observation: string;
    application: string;
    prayer: string;
}

export interface JournalEntry {
    _id: string;
    title: string;
    scriptureRef?: string;
    passageRef?: string;
    content: JournalContent;
    tags: string[];
    deleted: boolean;
    version: number;
    deletedAt?: string | null;
    createdAt: string;
    updatedAt: string;
    localId?: string;
    serverId?: string;
    clientId?: string;
    syncStatus?: "synced" | "pending_create" | "pending_update" | "pending_delete" | "pending_restore" | "pending_permanent_delete" | "conflict";
    lastSavedAt?: string;
}
