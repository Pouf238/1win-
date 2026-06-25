import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/providers/auth";
import { useColors } from "@/lib/theme";

export default function Index() {
  const { user, ready } = useAuth();
  const c = useColors();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.bg }}>
        <ActivityIndicator color={c.brand} size="large" />
      </View>
    );
  }
  return <Redirect href={user ? "/(tabs)" : "/(auth)/login"} />;
}
