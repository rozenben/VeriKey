import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#2563eb' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'VeriKey' }} />
      <Stack.Screen name="request" options={{ title: 'Request Verification' }} />
      <Stack.Screen name="verify/[token]" options={{ title: 'Verify' }} />
    </Stack>
  );
}
