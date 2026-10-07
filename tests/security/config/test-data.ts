export const TEST_USERS = {
  alice: {
    id: "test-alice",
    email: "alice@lab.test",
  },
  bob: {
    id: "test-bob",
    email: "bob@lab.test",
  },
} as const;

export const TEST_ORDERS = {
  aliceMacbook: 1,
  bobMonitor: 3,
} as const;

export const TEST_CHALLENGES = {
  idor: "test-challenge-idor",
  rateLimit: "test-challenge-rate-limit",
  emailEnumeration: "test-challenge-email-enumeration",
} as const;