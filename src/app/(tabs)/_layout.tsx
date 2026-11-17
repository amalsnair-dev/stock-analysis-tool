import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
      }}
    >
      <Tabs.Screen
        name="stock-taking"
        options={{
          title: "Stock Taking",
        }}
      />
      <Tabs.Screen
        name="item-details"
        options={{
          title: "Item Details",
        }}
      />
    </Tabs>
  );
}
