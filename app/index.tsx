import { ActivityIndicator, Image, View } from "react-native";

export default function Bootstrap() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#ffffff",
      }}
    >
      <Image
        source={require("../assets/images/splash-icon.png")}
        style={{ width: 200, height: 200, marginBottom: 16 }}
        resizeMode="contain"
      />
      <ActivityIndicator size="small" />
    </View>
  );
}
