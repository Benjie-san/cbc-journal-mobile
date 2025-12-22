import { useLocalSearchParams } from "expo-router";
import JournalEditor from "./editor";

export default function CreateJournal() {
    const { scriptureRef } = useLocalSearchParams<{ scriptureRef?: string }>();
    const initialScriptureRef = Array.isArray(scriptureRef)
        ? scriptureRef[0]
        : scriptureRef;

    return (
        <JournalEditor
            mode="create"
            initialScriptureRef={initialScriptureRef ?? ""}
        />
    );
}
