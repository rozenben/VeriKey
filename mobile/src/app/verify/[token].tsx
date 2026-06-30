import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export default function VerifyDeepLinkScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();

  useEffect(() => {
    if (!token) return;

    const verificationUrl = `${BASE_URL}/verify/${token}`;

    // Open the web verification page in the in-app browser.
    // The browser has access to the OS biometric APIs (Face ID / Fingerprint),
    // which is required for WebAuthn to work on mobile.
    WebBrowser.openBrowserAsync(verificationUrl, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
    }).catch(() => {
      // Browser was closed or unavailable — user can manually navigate
    });
  }, [token]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2563eb" />
      <Text style={styles.text}>Opening verification page…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  text: {
    fontSize: 16,
    color: '#6b7280',
  },
});
