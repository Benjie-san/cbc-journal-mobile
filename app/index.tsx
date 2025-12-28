import { ActivityIndicator, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Bootstrap() {
  return (
    <SafeAreaView
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0C3591",
      }}
    >
      <Image
        source={require("../assets/images/splash-icon.png")}
        style={{ width: 200, height: 200, marginBottom: 16 }}
        resizeMode="contain"
      />
      <ActivityIndicator size="small" />
    </SafeAreaView>
  );
}
