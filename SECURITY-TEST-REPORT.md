# Security Test Report

## 1. Overview

This project is a **QA Security Playground** designed to demonstrate practical security testing, vulnerability reproduction, security fixes, and automated security regression testing.

The security test suite is implemented using **Playwright** and covers common web application security scenarios.

### Security Test Summary

| Security Area                | Test Cases | Result      |
| ---------------------------- | ---------: | ----------- |
| IDOR / Broken Access Control |          5 | PASS        |
| Rate Limit                   |          1 | PASS        |
| Email Enumeration            |          1 | PASS        |
| Open Redirect                |          5 | PASS        |
| Finding & Scoring            |          3 | PASS        |
| Race Condition               |          1 | PASS        |
| **Total**                    |     **16** | **16 PASS** |

---

# 2. IDOR / Broken Access Control

## Vulnerability

Insecure Direct Object Reference (IDOR) occurs when an application exposes an object through a predictable identifier without properly verifying whether the authenticated user is authorized to access that object.

### Attack Scenario

Alice owns Order #1.

Bob attempts to access:

```http
GET /api/orders/1
X-User-ID: test-bob
```

### Vulnerable Behavior

The API returns Alice's order even though the request is made by Bob.

```text
Bob → GET /api/orders/1
       ↓
   Order #1
       ↓
    HTTP 200
```

### Security Fix

The API verifies that the requested order belongs to the current user.

```text
if order.userId !== currentUserId
    → HTTP 403 Forbidden
```

### Expected Security Behavior

| Scenario                     | Expected |
| ---------------------------- | -------: |
| Alice accesses Alice's order |      200 |
| Bob accesses Alice's order   |      403 |
| Bob accesses Bob's order     |      200 |
| Missing user identity        |      401 |
| Invalid order ID             |      400 |

### Automated Test

Test file:

`tests/security/idor.spec.ts`

Result:

**5 passed**

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

### Security Fix

The login endpoint enforces a request threshold.

Current security rule:

```text
5 attempts / 60 seconds
```

Requests exceeding the limit receive:

```http
HTTP 429 Too Many Requests
```

### Automated Test

Test file:

`tests/security/rate-limit.spec.ts`

Result:

**1 passed**

---

# 4. Email Enumeration

## Vulnerability

Email enumeration occurs when an application reveals whether an email address exists in the system.

For example:

```json
{
  "exists": true
}
```

versus:

```json
{
  "exists": false
}
```

An attacker could use this behavior to identify registered accounts.

### Attack Scenario

The attacker checks multiple email addresses and attempts to determine which accounts exist.

```text
attacker@example.com
alice@lab.test
admin@example.com
```

### Security Fix

The endpoint returns a generic response regardless of whether the account exists.

```json
{
  "exists": false,
  "message": "If the email is registered, further action is required."
}
```

### Expected Security Behavior

Existing and non-existing email addresses should not be distinguishable through the API response.

### Automated Test

Test file:

`tests/security/email-enumeration.spec.ts`

Result:

**1 passed**

---

# 5. Open Redirect

## Vulnerability

An open redirect occurs when an application accepts an attacker-controlled URL and redirects users to an external domain.

Example attack:

```text
/api/redirect?url=https://evil.example.com
```

### Vulnerable Behavior

The application redirects the victim to the attacker-controlled domain.

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

Test file:

`tests/security/open-redirect.spec.ts`

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

this violates the business security rule.

### Security Fix

The check and increment are performed atomically in PostgreSQL:

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

The successful update locks the affected row while the transaction is in progress.

A concurrent request must wait until the first transaction completes and then re-evaluate the condition.

### Expected Security Behavior

For two concurrent redemption requests:

```text
Request A → 200
Request B → 409
```

The order is not important.

The important security invariant is:

```text
successful redemptions <= maxUses
```

### Automated Test

Test file:

`tests/security/race-condition.spec.ts`

The test sends two requests concurrently using Playwright:

```ts
Promise.all([
  request.post(...),
  request.post(...),
]);
```

It verifies:

```text
[200, 409]
```

and additionally verifies the database state:

```text
usedCount = 1
usedCount <= maxUses
```

### Test Reproducibility

The test creates a unique coupon for each test execution and removes it afterward.

This makes the test independent from the deterministic application seed and allows repeated execution without manually resetting the database.

The test has been executed repeatedly:

```text
Run #1 → PASS
Run #2 → PASS
Run #3 → PASS
```

---

# 7. Finding & Scoring

The project also includes a finding submission and scoring mechanism.

Security findings are evaluated based on:

* Challenge
* Severity
* Evidence
* User
* Security condition

### Automated Tests

Test file:

`tests/security/finding.spec.ts`

Covered scenarios:

| Scenario                          | Expected Score |
| --------------------------------- | -------------: |
| Correct Rate Limit finding        |            100 |
| Incorrect finding                 |              0 |
| Correct Email Enumeration finding |            100 |

Result:

**3 passed**

---

# 8. Automated Security Test Architecture

The security tests are organized as:

```text
tests/security/
├── config/
│   └── test-data.ts
├── helpers/
│   └── security.ts
├── idor.spec.ts
├── rate-limit.spec.ts
├── email-enumeration.spec.ts
├── open-redirect.spec.ts
├── race-condition.spec.ts
└── finding.spec.ts
```

The tests focus on security behavior rather than implementation details.

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

The testing approach combines:

* Positive security testing
* Negative security testing
* Boundary testing
* Authorization testing
* API security testing
* Concurrency testing
* Database state validation
* Automated regression testing

The goal is not only to identify vulnerabilities but also to verify that security controls remain effective after fixes.

---

# 10. Security Test Results

The complete automated security test suite currently contains:

**16 security tests**

Latest execution:

```text
Running 16 tests using 6 workers

16 passed
0 failed
```

Execution time:

```text
5.2s
```

### Final Result

**16/16 security tests passed**

---

# 11. CI/CD Integration

The security test suite is designed to run automatically in GitHub Actions.

The CI pipeline performs:

1. Checkout source code
2. Setup Node.js
3. Install dependencies
4. Install Playwright browsers
5. Initialize PostgreSQL
6. Seed test data
7. Start the application
8. Probe API routes
9. Execute security tests

The pipeline is intended to act as a security regression gate so that security-related regressions can be detected before changes are merged.

---

# 12. Future Improvements

Planned improvements include:

* Allure security test reporting
* Security test evidence
* CI security gates
* Expanded API security scenarios
* Additional concurrency scenarios
* Security regression dashboard
* AI-assisted security test generation
* Automated security test case generation from requirements
* AI-assisted security test result summarization

---

# 13. Conclusion

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
Run Security Regression Tests
        ↓
Integrate With CI/CD
```

The current implementation successfully validates:

**16 automated security tests with 0 failures.**
