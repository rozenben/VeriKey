import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  Linking,
  ActivityIndicator,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { createRequest, getRequestStatus } from '../lib/api';

const DEFAULT_MESSAGE =
  "Can you confirm it's really you? Tap to verify with your fingerprint/Face ID.";

async function hashPhone(phone: string): Promise<string> {
  // React Native does not have crypto.subtle — use a simple djb2-style hash for demo.
  // PRODUCTION NOTE: Use a proper SHA-256 library (e.g. expo-crypto) and match the web client's hash.
  // import * as Crypto from 'expo-crypto';
  // return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, phone + 'verikey-salt');
  let hash = 5381;
  const str = phone + 'verikey-salt';
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

async function getOrCreateRequesterId(): Promise<string> {
  // In production, persist this UUID in AsyncStorage.
  // For MVP, generate a new one each time (won't break functionality, just loses history).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

type RequestResult = {
  id: string;
  token: string;
  verification_url: string;
};

export default function RequestScreen() {
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [loading, setLoading] = useState(false);
  const [requestResult, setRequestResult] = useState<RequestResult | null>(null);
  const [pollStatus, setPollStatus] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handlePickContact = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow contacts access to pick a contact.');
      return;
    }
    const result = await Contacts.presentContactPickerAsync();
    if (result && result.name) {
      setContactName(result.name);
      // Pick first phone number
      const phone = result.phoneNumbers?.[0]?.number ?? '';
      // Normalize: strip non-digits for hashing, keep original for display
      setContactPhone(phone);
    }
  };

  const startPolling = (id: string) => {
    setPollStatus('pending');
    pollIntervalRef.current = setInterval(async () => {
      try {
        const data = await getRequestStatus(id);
        setPollStatus(data.status);
        if (data.status !== 'pending') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        }
      } catch {
        // ignore poll errors
      }
    }, 4000);
  };

  const handleSend = async (method: 'whatsapp' | 'sms') => {
    if (!contactPhone) {
      Alert.alert('No contact selected', 'Please pick a contact first.');
      return;
    }

    setLoading(true);
    try {
      const requesterId = await getOrCreateRequesterId();
      const phoneHash = await hashPhone(contactPhone.replace(/\D/g, ''));
      const messageText = message || DEFAULT_MESSAGE;

      const result: RequestResult = await createRequest({
        requester_id: requesterId,
        phone_number_hash: phoneHash,
        message_text: messageText,
      });

      setRequestResult(result);
      startPolling(result.id);

      const fullMessage = `${messageText}\n\n${result.verification_url}`;
      const e164 = contactPhone.replace(/\D/g, '');

      let url: string;
      if (method === 'whatsapp') {
        url = `https://wa.me/${e164}?text=${encodeURIComponent(fullMessage)}`;
      } else {
        url = `sms:${e164}?body=${encodeURIComponent(fullMessage)}`;
      }

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Cannot open', `Unable to open ${method === 'whatsapp' ? 'WhatsApp' : 'SMS'}. Is the app installed?`);
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create request.');
    } finally {
      setLoading(false);
    }
  };

  const statusColor: Record<string, string> = {
    pending: '#f59e0b',
    approved: '#059669',
    rejected: '#dc2626',
    expired: '#6b7280',
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionHeader}>Recipient</Text>

      <Pressable style={styles.pickButton} onPress={handlePickContact}>
        <Text style={styles.pickButtonText}>
          {contactName ? `${contactName} — ${contactPhone}` : 'Pick Contact'}
        </Text>
      </Pressable>

      <Text style={styles.sectionHeader}>Message</Text>
      <TextInput
        style={styles.messageInput}
        value={message}
        onChangeText={setMessage}
        multiline
        numberOfLines={4}
        placeholder="Enter your verification message..."
      />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} size="large" color="#2563eb" />
      ) : requestResult ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Request Sent</Text>
          <Text style={styles.resultUrl} numberOfLines={2}>{requestResult.verification_url}</Text>
          {pollStatus && (
            <View style={[styles.statusBadge, { backgroundColor: statusColor[pollStatus] ?? '#6b7280' }]}>
              <Text style={styles.statusText}>
                {pollStatus.charAt(0).toUpperCase() + pollStatus.slice(1)}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <>
          <Pressable
            style={[styles.sendButton, { backgroundColor: '#25D366' }]}
            onPress={() => handleSend('whatsapp')}
          >
            <Text style={styles.sendButtonText}>Send via WhatsApp</Text>
          </Pressable>

          <Pressable
            style={[styles.sendButton, { backgroundColor: '#374151', marginTop: 12 }]}
            onPress={() => handleSend('sms')}
          >
            <Text style={styles.sendButtonText}>Send via SMS</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 24,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
  },
  pickButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pickButtonText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '500',
  },
  messageInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    fontSize: 15,
    color: '#111827',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  sendButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  resultUrl: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statusText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
