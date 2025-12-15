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
    content: JournalContent;
    tags: string[];
    deleted: boolean;
    deletedAt?: string | null;
    createdAt: string;
    updatedAt: string;
}
