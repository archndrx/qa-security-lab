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
| TC-REDIR-006 | Backslash-based external URL (`/\evil.example.com`) | Unsafe redirect is blocked (400) | High | `tests/security/open-redirect.spec.ts` |
| TC-REDIR-007 | Ambiguous paths (encoded slash/backslash, `///`, whitespace) | Unsafe redirect is blocked (400) | High | `tests/security/open-redirect.spec.ts` |
| TC-MA-006 | Expired session cookie on profile update | Request is rejected | High | `tests/security/mass-assignment.spec.ts` |
| TC-MA-007 | Empty or whitespace-only name | Request is rejected (400) | Medium | `tests/security/mass-assignment.spec.ts` |
| TC-MA-008 | Name longer than 100 characters | Request is rejected (400) | Medium | `tests/security/mass-assignment.spec.ts` |
| TC-MA-009 | Correctly signed session without a `jti` claim | Request is rejected (401) | High | `tests/security/mass-assignment.spec.ts` |
| TC-RATE-002 | Ten concurrent failed logins (unique email) | Exactly 5 × 401 and 5 × 429 | High | `tests/security/rate-limit.spec.ts` |
| TC-RATE-001 | Five failed logins, then two more (unique email, PostgreSQL-backed limit) | 401 ×5, then 429 ×2 | High | `tests/security/rate-limit.spec.ts` |
| TC-ENUM-001 | Compare responses for existing and non-existing emails | Account existence is not distinguishable from responses | Medium | `tests/security/email-enumeration.spec.ts` |
| TC-ENUM-002 | Invalid JSON body | Request is rejected (400) | Low | `tests/security/email-enumeration.spec.ts` |
| TC-ENUM-003 | Invalid email values | Request is rejected (400) | Low | `tests/security/email-enumeration.spec.ts` |
| TC-RACE-001 | Concurrent coupon redemption | Responses are HTTP 200 and HTTP 409; database usedCount remains 1 and does not exceed maxUses | High | `tests/security/race-condition.spec.ts` |
| TC-RACE-002 | Redemption of a fully used coupon | Request is rejected | High | `tests/security/race-condition.spec.ts` |
| TC-RACE-003 | Same user redeems twice while uses remain | HTTP 409, not a server error | Medium | `tests/security/race-condition.spec.ts` |
| TC-SDE-001 | Successful login response | No password, hash, token, or user object exposed | High | `tests/security/sensitive-data-exposure.spec.ts` |
| TC-SDE-002 | Failed login response | Generic error; submitted password not echoed | High | `tests/security/sensitive-data-exposure.spec.ts` |
| TC-SDE-003 | Invalid JSON body | 400 without `detail` or `stack` fields | Medium | `tests/security/sensitive-data-exposure.spec.ts` |
| TC-SDE-004 | Missing login fields, non-string email, empty password | Requests are rejected (400) | Medium | `tests/security/sensitive-data-exposure.spec.ts` |
| TC-SDE-005 | Session cookie attributes after login | HttpOnly, SameSite=Lax, Path=/, Max-Age=3600 | High | `tests/security/sensitive-data-exposure.spec.ts` |
| TC-SDE-006 | Logout | Session cookie is cleared | Medium | `tests/security/sensitive-data-exposure.spec.ts` |
| TC-SDE-007 | Copied session token reused after logout | Request is rejected (401) | Critical | `tests/security/sensitive-data-exposure.spec.ts` |
| TC-FIND-001 | Finding submission and scoring (correct, incorrect, latest, other user's) | Correct scores and no cross-user exposure | High | `tests/security/finding.spec.ts` |
| TC-FIND-002 | Unauthenticated submission or forged userId | Rejected / not impersonated | Critical | `tests/security/finding.spec.ts` |
| TC-FIND-003 | Unknown slug, invalid severity, empty or oversized evidence | Rejected (404 / 400) | Medium | `tests/security/finding.spec.ts` |
| TC-FIND-004 | Client sends `isCorrect: true` | Ignored; finding stored as incorrect | High | `tests/security/finding.spec.ts` |
| TC-ERR-001 | Finding creation fails internally | Generic 500; no internal details leaked | High | `tests/findings-error-handling.spec.ts` |

## Execution Evidence

| Field | Value |
|---|---|
| Test framework | Playwright |
| Test type | API security testing |
| Evidence sources | Playwright output and Allure report (`docs/screenshots/`) |
| Last execution | 2026-10-19, local environment |
| Result | 58 passed, 0 failed, 0 skipped (19.4s) |

The test cases above group the 58 automated tests that passed in that run
(some rows cover several closely related tests). Related documents:
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
