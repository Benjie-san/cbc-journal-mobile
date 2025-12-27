import { useLocalSearchParams } from "expo-router";
import JournalEditor from "./editor";

export default function CreateJournal() {
    const { scriptureRef, fromBrp } = useLocalSearchParams<{
        scriptureRef?: string;
        fromBrp?: string;
    }>();
    const initialScriptureRef = Array.isArray(scriptureRef)
        ? scriptureRef[0]
        : scriptureRef;
    const hideBrp = fromBrp === "1" || fromBrp === "true";

    return (
        <JournalEditor
            mode="create"
            initialScriptureRef={initialScriptureRef ?? ""}
            fromBrp={hideBrp}
        />
    );
}
