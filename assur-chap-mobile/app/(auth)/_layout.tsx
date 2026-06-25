import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/providers/auth";

export default function AuthLayout() {
  const { user, ready } = useAuth();
  if (ready && user) return <Redirect href="/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
