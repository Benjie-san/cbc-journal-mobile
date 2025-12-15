import { useLocalSearchParams } from "expo-router";
import JournalEditor from "./editor";

export default function EditJournal() {
    const { id } = useLocalSearchParams<{ id: string }>();

    return <JournalEditor mode="edit" id={id} />;
}
