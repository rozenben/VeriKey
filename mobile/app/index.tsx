import { View, Text, Pressable, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';

// TODO: Replace with real API polling for recent requests
const RECENT_REQUESTS: { id: string; recipientName: string; status: string; createdAt: string }[] = [];

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>VeriKey</Text>
        <Text style={styles.heroSubtitle}>Biometric identity verification, simplified.</Text>
      </View>

      <Pressable
        style={styles.primaryButton}
        onPress={() => router.push('/request')}
      >
        <Text style={styles.primaryButtonText}>Request Verification</Text>
      </Pressable>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Requests</Text>
        {RECENT_REQUESTS.length === 0 ? (
          <Text style={styles.emptyText}>No requests yet. Tap above to send your first verification request.</Text>
        ) : (
          <FlatList
            data={RECENT_REQUESTS}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.requestItem}>
                <Text style={styles.requestRecipient}>{item.recipientName}</Text>
                <Text style={styles.requestStatus}>{item.status}</Text>
                <Text style={styles.requestDate}>{item.createdAt}</Text>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 24,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#111827',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  section: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  emptyText: {
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 22,
  },
  requestItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  requestRecipient: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  requestStatus: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  requestDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
});
