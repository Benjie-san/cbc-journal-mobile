import { ActivityIndicator, View } from "react-native";

export default function Bootstrap() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="small" />
    </View>
  );
}
