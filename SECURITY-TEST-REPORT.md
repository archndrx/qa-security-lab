# Security Test Report

## 1. Overview

This project is a **QA Security Playground** designed to demonstrate practical security testing, vulnerability reproduction, security fixes, automated security regression testing, and CI/CD integration.

The security test suite is implemented using **Playwright** and covers common web application security scenarios.

The project currently contains **29 automated security tests** covering:

* IDOR / Broken Access Control
* Rate Limit
* Email Enumeration
* Open Redirect
* Race Condition
* Finding & Scoring
* Mass Assignment
* Sensitive Data Exposure

Allure is used to generate a visual test report from the Playwright execution results.

### Security Test Summary

| Security Area                | Test Cases | Result      |
| ---------------------------- | ---------: | ----------- |
| IDOR / Broken Access Control |          6 | PASS        |
| Rate Limit                   |          1 | PASS        |
| Email Enumeration            |          1 | PASS        |
| Open Redirect                |          5 | PASS        |
| Finding & Scoring            |          7 | PASS        |
| Race Condition               |          1 | PASS        |
| Mass Assignment              |          5 | PASS        |
| Sensitive Data Exposure      |          3 | PASS        |
| **Total**                    |     **29** | **29 PASS** |

---

# 2. IDOR / Broken Access Control

## Vulnerability

Insecure Direct Object Reference (IDOR) occurs when an application exposes an object through a predictable identifier without properly verifying whether the requesting user is authorized to access that object.

### Attack Scenario

Alice owns Order #1.

Bob is authenticated with his own session and attempts to access:

```http
GET /api/orders/1
Cookie: qa_session=<Bob's signed session>
```

A client-supplied `X-User-ID` header is not trusted and grants no access.

### Vulnerable Behavior

The vulnerable implementation allows Bob to retrieve Alice's order.

```text
Bob → GET /api/orders/1
       ↓
   Order #1
       ↓
    HTTP 200
```

### Security Fix

The API identifies the current user from the signed `qa_session` cookie and verifies that the requested order belongs to that user. Ownership is always enforced; the former `IDOR_SECURITY_FIX` toggle was removed.

```text
if order.userId !== sessionUserId
    → HTTP 403 Forbidden
```

### Expected Security Behavior

| Scenario                     | Expected |
| ---------------------------- | -------: |
| Alice accesses Alice's order |      200 |
| Bob accesses Alice's order   |      403 |
| Bob accesses Bob's order     |      200 |
| Missing session              |      401 |
| Forged `X-User-ID` header    |      401 |
| Invalid order ID             |      400 |

### Automated Test

```text
tests/security/idor.spec.ts
```

Result:

**6 passed**

---

# 3. Rate Limit

## Vulnerability

An authentication endpoint may be vulnerable to brute-force attacks when repeated failed login attempts are not properly rate limited.

### Attack Scenario

An attacker repeatedly sends invalid login credentials.

```text
Attempt 1 → 401
Attempt 2 → 401
Attempt 3 → 401
Attempt 4 → 401
Attempt 5 → 401
Attempt 6 → 429
```

### Security Control

The current playground implementation enforces:

```text
5 attempts / 60 seconds
```

The limit is tracked per email address, and passwords are verified against bcrypt hashes.

Requests exceeding the threshold receive:

```http
HTTP 429 Too Many Requests
```

### Automated Test

```text
tests/security/rate-limit.spec.ts
```

Result:

**1 passed**

> The current rate-limit implementation uses in-memory state and is intentionally simplified for the local security playground. A production implementation would require a shared/distributed rate-limiting mechanism.

---

# 4. Email Enumeration

## Vulnerability

Email enumeration occurs when an application reveals whether an email address exists in the system.

A vulnerable response may expose information such as:

```json
{
  "exists": true
}
```

while a non-existing account may return:

```json
{
  "exists": false
}
```

This allows an attacker to identify registered accounts.

### Security Fix

The endpoint returns a generic response regardless of account existence.

```json
{
  "exists": false,
  "message": "If the email is registered, further action is required."
}
```

### Expected Security Behavior

Existing and non-existing email addresses should not be distinguishable through the API response.

### Automated Test

```text
tests/security/email-enumeration.spec.ts
```

Result:

**1 passed**

---

# 5. Open Redirect

## Vulnerability

An open redirect occurs when an application accepts an attacker-controlled URL and redirects users to an external domain.

Example:

```text
/api/redirect?url=https://evil.example.com
```

### Vulnerable Behavior

The vulnerable implementation redirects the request to the attacker-controlled domain.

```text
Application
    ↓
https://evil.example.com
```

### Security Fix

Only internal relative paths are accepted.

Allowed:

```text
/dashboard
/profile
/settings
```

Blocked:

```text
https://evil.example.com
//evil.example.com
javascript:alert(1)
```

### Expected Security Behavior

| Input                 | Expected |
| --------------------- | -------: |
| External URL          |      400 |
| Protocol-relative URL |      400 |
| JavaScript URL        |      400 |
| Internal path         |      307 |
| Missing URL           |      400 |

### Automated Test

```text
tests/security/open-redirect.spec.ts
```

Result:

**5 passed**

---

# 6. Race Condition

## Vulnerability

A race condition can occur when multiple concurrent requests perform a check and update as separate operations.

### Vulnerable Flow

The vulnerable implementation performs:

```text
1. Read usedCount
2. Check usedCount < maxUses
3. Wait
4. Update usedCount
5. Create redemption
```

Two concurrent requests can observe the same state.

```text
Request A → usedCount = 0
Request B → usedCount = 0

Request A → passes check
Request B → passes check

Request A → redemption succeeds
Request B → redemption succeeds
```

For a coupon with:

```text
maxUses = 1
```

this violates the intended business rule.

### Security Fix

The fixed implementation performs the usage check and increment atomically in PostgreSQL:

```sql
UPDATE "Coupon"
SET "usedCount" = "usedCount" + 1
WHERE "code" = $1
  AND "usedCount" < "maxUses"
RETURNING
  "id",
  "code",
  "discount",
  "usedCount",
  "maxUses"
```

The update is executed inside a PostgreSQL transaction together with the redemption insert.

### Expected Security Behavior

Two concurrent requests should produce:

```text
Request A → 200
Request B → 409
```

The response order is not important.

The important security invariant is:

```text
successful redemptions <= maxUses
```

### Automated Test

```text
tests/security/race-condition.spec.ts
```

The test logs in as two separate users (Alice and Bob, each with their own session) and sends two requests concurrently. The redeeming user is taken from the session, not the request body:

```ts
Promise.all([
  aliceRequest.post(...),
  bobRequest.post(...),
]);
```

It verifies:

```text
[200, 409]
```

and validates the database state:

```text
usedCount = 1
usedCount <= maxUses
```

### Test Isolation

The test creates a unique coupon for every execution and removes it afterward.

This prevents the test from depending on the state of the deterministic application seed.

The test has been independently executed multiple times:

```text
Run #1 → PASS
Run #2 → PASS
Run #3 → PASS
```

---

# 7. Finding & Scoring

The project contains a finding submission and scoring mechanism.

A security finding contains:

* User
* Challenge
* Severity
* Evidence
* Correct/incorrect classification

### Automated Tests

```text
tests/security/finding.spec.ts
```

Covered scenarios:

Findings are created and read for the authenticated session user. A `userId` in the request body cannot impersonate another user.

| Scenario                                    |          Expected |
| ------------------------------------------- | ----------------: |
| Correct Rate Limit finding                  |         Score 100 |
| Incorrect finding                           |           Score 0 |
| Correct Email Enumeration finding           |         Score 100 |
| Unauthenticated submission                  |          Rejected |
| Forged `userId` in body                     |   Not impersonated |
| Result returns latest finding of session user |    Latest finding |
| Another user's finding                      |      Not exposed |

Result:

**7 passed**

---

# 8. Automated Security Test Architecture

The security tests are organized as:

```text
tests/security/
├── config/
│   └── test-data.ts
├── helpers/
│   ├── security.ts
│   └── session.ts
├── idor.spec.ts
├── rate-limit.spec.ts
├── email-enumeration.spec.ts
├── open-redirect.spec.ts
├── race-condition.spec.ts
├── mass-assignment.spec.ts
├── sensitive-data-exposure.spec.ts
└── finding.spec.ts
```

The tests focus on observable security behavior rather than implementation details.

Examples:

```text
Unauthorized access → 403
Missing authentication context → 401
Rate limit exceeded → 429
Unsafe redirect → 400
Race condition → only one successful redemption
```

---

# 9. Security Testing Approach

The project combines:

* Positive security testing
* Negative security testing
* Boundary testing
* Authorization testing
* API security testing
* Concurrency testing
* Database state validation
* Automated regression testing

The general workflow is:

```text
Security Risk
      ↓
Manual Reproduction
      ↓
Security Test Scenario
      ↓
Automated Test
      ↓
Security Fix
      ↓
Regression Test
      ↓
Allure Report
      ↓
CI/CD Validation
```

The goal is not only to reproduce a vulnerability but also to verify that the corresponding security control remains effective after future changes.

---

# 10. Allure Security Reporting

The project uses Allure as a reporting layer for Playwright security tests.

Reporting flow:

```text
Playwright
    ↓
allure-playwright
    ↓
allure-results/
    ↓
allure-commandline
    ↓
allure-report/
```

The report can be generated with:

```bash
npx allure generate allure-results --clean -o allure-report
```

For local preview in a WSL environment:

```bash
cd allure-report
python3 -m http.server 8080 --bind 0.0.0.0
```

Then access:

```text
http://localhost:8080
```

Generated Allure artifacts are excluded from version control.

---

# 11. Mass Assignment

## Vulnerability

Mass Assignment occurs when an application binds client-supplied fields to
sensitive model attributes without restricting which fields may be changed.

## Reproduction Evidence

The vulnerable profile endpoint accepted a request containing `isAdmin: true`
and changed Alice's database record from `isAdmin = false` to `isAdmin = true`.

The behavior was reproduced using curl and verified directly against PostgreSQL.

## Remediation

The endpoint now requires an authenticated session and updates only the
explicitly permitted `name` field. The acting user is taken from the signed
`qa_session` cookie, so a client-supplied `userId` is ignored. Client-supplied
`isAdmin` and `isVerified` fields are not included in the SQL update query.

## Automated Regression Tests

- Protected attributes remain unchanged when included in a malicious request.
- A normal profile name update succeeds.
- Alice cannot update Bob by forging `userId`.
- A tampered session cookie is rejected (`401`).
- Requests without a valid session are rejected (`401`).

Each test creates its own temporary user (with a bcrypt-hashed password) and
deletes it afterward, so the per-email login rate limit cannot couple tests.

**Result:** 5/5 tests passed.

## Remaining Risk

The session is a simple HMAC-signed cookie for this lab. It has no server-side
revocation or rotation. This lab app is not production-ready.

---

# 12. Sensitive Data Exposure

## Vulnerability

Sensitive Data Exposure occurs when API responses reveal secrets or internal
details such as passwords, password hashes, tokens, stack traces, or
parser errors.

## Security Controls

* Login responses contain only a message and `userId`.
* Failed logins return a generic `Invalid credentials` error.
* Malformed JSON sent to `/api/findings` returns `400 Invalid JSON body`.
* Unexpected server errors return a generic `Failed to create finding`
  message; details are logged server-side only.

## Automated Tests

```text
tests/security/sensitive-data-exposure.spec.ts
```

| Scenario                  | Expected Result                                  |
| ------------------------- | ------------------------------------------------ |
| Successful login          | No password, hash, token, or user object exposed |
| Failed login              | Generic error; submitted password not echoed     |
| Invalid JSON body         | `400` with no `detail` or `stack` fields         |

### Test Isolation

The rate limit is keyed by email and stored in module-level memory. The
rate limit test therefore uses a dedicated email
(`rate-limit-test@lab.test`) so it cannot lock out the valid Alice account
used by these tests when they run in parallel.

### Verification Limits

The generic `500 Failed to create finding` response is an implemented
control, but no automated test currently triggers an HTTP 500 to verify it.
Only the successful login, failed login, and invalid JSON scenarios are
covered by regression tests.

**Result:** 3/3 tests passed.

---

# 13. Security Test Results

The complete automated security test suite currently contains:

**29 security tests**

Latest confirmed execution:

```text
Running 29 tests using 6 workers

29 passed (13.2s)
0 failed
```

Execution time:

```text
13.2s
```

### Final Result

**29/29 security tests passed**

---

# 14. CI/CD Integration

The security test suite is integrated into GitHub Actions.

The CI pipeline performs:

1. Checkout source code
2. Setup Node.js
3. Install dependencies
4. Install Playwright browsers
5. Initialize PostgreSQL
6. Seed deterministic test data
7. Start the application
8. Probe API routes
9. Execute security tests

The pipeline is intended to function as a security regression gate so that security-related regressions can be detected during CI execution.

---

# 15. Current Coverage

Current implemented security scenarios:

| Security Area                | Status      |
| ---------------------------- | ----------- |
| IDOR / Broken Access Control | Implemented |
| Rate Limit                   | Implemented |
| Email Enumeration            | Implemented |
| Open Redirect                | Implemented |
| Race Condition               | Implemented |
| Finding & Scoring            | Implemented |
| Playwright Automation        | Implemented |
| Allure Reporting             | Implemented |
| GitHub Actions CI            | Implemented |
| Mass Assignment              | Remediated  |
| Session Authentication       | Implemented |
| Password Hashing (bcrypt)    | Implemented |
| Sensitive Data Exposure      | Implemented |

---

# 16. Future Improvements

Planned improvements include:

* Server-side session revocation and rotation
* Role-based Access Control / Privilege Escalation
* Expanded API security scenarios
* Expanded CI security gates
* Security test evidence and attachments
* AI-assisted security test generation
* Automated security test case generation from requirements
* AI-assisted security test result summarization

---

# 17. Conclusion

The QA Security Playground demonstrates an end-to-end security testing workflow:

```text
Identify Vulnerability
        ↓
Reproduce Attack
        ↓
Define Expected Security Behavior
        ↓
Implement Security Fix
        ↓
Create Automated Security Test
        ↓
Validate Application Behavior
        ↓
Generate Allure Report
        ↓
Run Security Regression Tests
        ↓
Integrate With CI/CD
```

The current implementation successfully validates:

**29 automated security tests with 0 failures.**

The project is intentionally designed as a learning and portfolio environment rather than a production security platform.
