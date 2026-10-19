# Security Test Cases

## Overview

Selected security scenarios for the QA Security Lab project.
Automated test references are included for traceability.

## Test Cases

| ID | Scenario | Expected Result | Priority | Automated Test Reference |
|---|---|---|---|---|
| TC-IDOR-001 | Alice accesses her own order | Request is authorized | High | `tests/security/idor.spec.ts` |
| TC-IDOR-002 | Bob accesses Alice's order | Cross-user access is denied | Critical | `tests/security/idor.spec.ts` |
| TC-IDOR-003 | Bob accesses his own order | Request is authorized | High | `tests/security/idor.spec.ts` |
| TC-IDOR-004 | Request without a session | Request is rejected | Critical | `tests/security/idor.spec.ts` |
| TC-IDOR-005 | Forged X-User-ID header | Header manipulation does not grant access | Critical | `tests/security/idor.spec.ts` |
| TC-IDOR-006 | Invalid order ID | HTTP 400; invalid resource identifier is rejected | Medium | `tests/security/idor.spec.ts` |
| TC-RBAC-001 | Unauthenticated request to protected endpoint | Access is denied | Critical | `tests/security/rbac.spec.ts` |
| TC-RBAC-002 | Regular user accesses admin endpoint | Access is denied | Critical | `tests/security/rbac.spec.ts` |
| TC-RBAC-003 | Admin accesses admin endpoint | Access is allowed | High | `tests/security/rbac.spec.ts` |
| TC-RBAC-004 | Session belongs to a deleted user | Access is rejected | High | `tests/security/rbac.spec.ts` |
| TC-RBAC-005 | Mass-assignment attempt to gain admin access | Admin privileges are not granted | Critical | `tests/security/rbac.spec.ts` |
| TC-MA-001 | Attempt to modify protected fields | Protected fields cannot be changed without authorization | Critical | `tests/security/mass-assignment.spec.ts` |
| TC-MA-002 | Update name without protected fields | Valid profile update is allowed | Medium | `tests/security/mass-assignment.spec.ts` |
| TC-MA-003 | Alice updates Bob's profile by forging userId | Cross-user update is denied | Critical | `tests/security/mass-assignment.spec.ts` |
| TC-MA-004 | Tampered session cookie | Request is rejected | High | `tests/security/mass-assignment.spec.ts` |
| TC-MA-005 | Profile update without a valid session | Request is rejected | High | `tests/security/mass-assignment.spec.ts` |
| TC-REDIR-001 | External redirect URL | External redirect is blocked | High | `tests/security/open-redirect.spec.ts` |
| TC-REDIR-002 | Protocol-relative redirect URL | Unsafe redirect is blocked | High | `tests/security/open-redirect.spec.ts` |
| TC-REDIR-003 | JavaScript redirect URL | Unsafe redirect is blocked | Critical | `tests/security/open-redirect.spec.ts` |
| TC-REDIR-004 | Internal redirect path | Internal redirect is allowed | Medium | `tests/security/open-redirect.spec.ts` |
| TC-REDIR-005 | Missing redirect URL | Request is rejected | Low | `tests/security/open-redirect.spec.ts` |
| TC-RATE-001 | Login endpoint receives excessive requests | Rate limiting is enforced | High | `tests/security/rate-limit.spec.ts` |
| TC-ENUM-001 | Compare responses for existing and non-existing emails | Account existence is not distinguishable from responses | Medium | `tests/security/email-enumeration.spec.ts` |
| TC-RACE-001 | Concurrent coupon redemption | Responses are HTTP 200 and HTTP 409; database usedCount remains 1 and does not exceed maxUses | High | `tests/security/race-condition.spec.ts` |

## Execution Evidence

| Field | Value |
|---|---|
| Test framework | Playwright |
| Test type | API security testing |
| Evidence sources | Playwright output and Allure report (`docs/screenshots/`) |
| Last execution | 2026-10-19, local environment |
| Result | 35 passed, 0 failed, 0 skipped (14.2s) |

All 24 test cases above map to automated tests that passed in that run
(the remaining 11 tests cover finding/scoring, sensitive data exposure,
and findings error handling). Related documents:
[IDOR regression proof](idor-regression-proof.md) and the
[Security Test Report](../SECURITY-TEST-REPORT.md).

Re-record the date, result, and any associated defect after each execution.
Do not mark a case as Passed without verifying the actual test result.

## Defect Report Template

- **Title:**
- **Environment:**
- **Preconditions:**
- **Steps to Reproduce:**
- **Expected Result:**
- **Actual Result:**
- **Severity / Priority:**
- **Evidence:**
- **Related Test Case:**

## Notes

- Priority represents an initial risk assessment and may be adjusted.
- Confirm exact response codes and behavior from the implementation and assertions.
- Do not include real credentials, session cookies, or sensitive data in evidence.
- These selected test cases do not represent complete security coverage.
