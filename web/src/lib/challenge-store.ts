// In-memory challenge stores keyed by phone_number_hash.
// PRODUCTION NOTE: Replace with Redis or a DB table with TTL.
export const registrationChallengeStore = new Map<string, string>();
export const authChallengeStore = new Map<string, string>();
