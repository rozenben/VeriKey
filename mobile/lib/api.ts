const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function createRequest(body: {
  requester_id: string;
  phone_number_hash: string;
  message_text: string;
}) {
  const res = await fetch(`${BASE_URL}/api/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to create request');
  return res.json();
}

export async function getRequestStatus(id: string) {
  const res = await fetch(`${BASE_URL}/api/requests/${id}/status`);
  if (!res.ok) throw new Error('Failed to get status');
  return res.json();
}
