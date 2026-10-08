[![Security Tests](https://github.com/archndrx/qa-security-lab/actions/workflows/security-tests.yml/badge.svg)](https://github.com/archndrx/qa-security-lab/actions/workflows/security-tests.yml)

# QA Security Playground

A security-focused testing playground built to demonstrate **security testing, API testing, automated security regression testing, and CI/CD integration** from a QA Engineer perspective.

The project simulates common web application security scenarios and demonstrates an end-to-end workflow:

```text
Vulnerability
      ↓
Manual Reproduction
      ↓
Security Test Scenario
      ↓
Automated Playwright Test
      ↓
Security Fix
      ↓
Regression Test
      ↓
Allure Reporting
      ↓
CI/CD Validation
```

The project is designed as a practical QA Engineering portfolio project, with emphasis on validating security controls through reproducible automated tests.

---

## 🎯 Project Goals

This project demonstrates how a QA Engineer can:

* Identify common web application security vulnerabilities
* Design positive, negative, boundary, and abuse-case scenarios
* Reproduce security vulnerabilities manually
* Validate API behavior and HTTP responses
* Automate security regression tests with Playwright
* Validate concurrency-related security behavior
* Verify that security fixes remain effective
* Generate Allure security test reports
* Integrate automated security tests into CI/CD
* Create deterministic test data for reliable local and CI execution

---

## 🔐 Security Challenges

### 1. IDOR / Broken Access Control

Tests whether a user can access another user's order by manipulating the order ID.

**Scenario:**

```text
Alice → Order #1
Bob   → Order #3
```

Expected behavior:

```text
Alice → Order #1 → 200 OK
Bob   → Order #1 → 403 Forbidden
Bob   → Order #3 → 200 OK
```

Automated coverage includes:

* Authorized resource access
* Unauthorized resource access
* Missing authentication context
* Invalid resource ID

Test file:

```text
tests/security/idor.spec.ts
```

Result:

**5 passed**

---

### 2. Rate Limit

Tests whether the login endpoint prevents unlimited authentication attempts.

Expected behavior:

```text
Attempt 1–5 → 401 Unauthorized
Attempt 6+   → 429 Too Many Requests
```

The current local implementation uses a threshold of:

```text
5 attempts / 60 seconds
```

The Playwright test verifies that repeated failed login attempts eventually receive HTTP `429`.

Test file:

```text
tests/security/rate-limit.spec.ts
```

Result:

**1 passed**

> Note: the current in-memory implementation is intentionally simplified for the playground and is not intended to represent a production-grade distributed rate-limiting solution.

---

### 3. Email Enumeration

Tests whether an attacker can determine whether an email address is registered.

A vulnerable implementation may return different information for existing and non-existing accounts.

The fixed implementation returns a generic response so that account existence is not exposed through the API response.

Expected behavior:

```text
Existing email     → Generic response
Non-existing email → Generic response
```

Test file:

```text
tests/security/email-enumeration.spec.ts
```

Result:

**1 passed**

---

### 4. Open Redirect

Tests whether an attacker can manipulate a redirect parameter to redirect users to an external website.

Example attack:

```text
/api/redirect?url=https://evil.example.com
```

The fixed implementation only allows internal relative paths.

Expected behavior:

```text
/dashboard                 → 307 Temporary Redirect
https://evil.example.com  → 400 Bad Request
//evil.example.com        → 400 Bad Request
javascript:alert(1)       → 400 Bad Request
```

Automated coverage includes:

* External URL
* Protocol-relative URL
* JavaScript URL
* Valid internal path
* Missing redirect URL

Test file:

```text
tests/security/open-redirect.spec.ts
```

Result:

**5 passed**

---

### 5. Race Condition

Tests whether concurrent coupon redemption requests can bypass a usage limit.

The challenge uses a coupon with:

```text
maxUses = 1
```

Two concurrent requests attempt to redeem the same coupon.

The vulnerable design separates the usage check from the update, allowing multiple requests to observe the same state.

The fixed implementation uses an atomic PostgreSQL update inside a transaction.

Expected behavior:

```text
Request A → 200
Request B → 409
```

The order of the responses is not important. The security invariant is:

```text
successful redemptions <= maxUses
```

The automated test also validates the resulting database state.

Test file:

```text
tests/security/race-condition.spec.ts
```

Result:

**1 passed**

The race-condition test creates a unique coupon for each execution and cleans it up afterward, making it independent from the deterministic application seed.

---

### 6. Finding & Scoring

The playground contains a finding submission and scoring mechanism.

A security finding contains:

* User
* Challenge
* Severity
* Evidence
* Correct/incorrect classification

Automated tests verify that:

```text
Correct security finding → Score 100
Incorrect finding         → Score 0
```

Test file:

```text
tests/security/finding.spec.ts
```

Result:

**3 passed**

---

## 🧪 Automated Security Testing

Security regression tests are implemented using **Playwright**.

Current coverage:

| Area                         |  Tests | Result      |
| ---------------------------- | -----: | ----------- |
| IDOR / Broken Access Control |      5 | PASS        |
| Rate Limit                   |      1 | PASS        |
| Email Enumeration            |      1 | PASS        |
| Open Redirect                |      5 | PASS        |
| Finding & Scoring            |      3 | PASS        |
| Race Condition               |      1 | PASS        |
| **Total**                    | **16** | **16 PASS** |

Run the complete security suite:

```bash
npx playwright test tests/security
```

Latest confirmed execution:

```text
Running 16 tests using 6 workers

16 passed
0 failed
```

---

## 📊 Allure Security Reporting

The project uses **Allure** to generate a visual security test report from Playwright results.

Reporting stack:

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

Generate the report:

```bash
npx allure generate allure-results --clean -o allure-report
```

For local preview, the generated static report can be served using:

```bash
cd allure-report
python3 -m http.server 8080 --bind 0.0.0.0
```

Then open:

```text
http://localhost:8080
```

Generated Allure artifacts are excluded from Git through `.gitignore`.

---

## 🔎 Security Test Coverage

| Security Area      | Attack Scenario                        | Expected Result          | Automated |
| ------------------ | -------------------------------------- | ------------------------ | --------- |
| IDOR               | User accesses another user's order     | `403 Forbidden`          | ✅         |
| IDOR               | User accesses own order                | `200 OK`                 | ✅         |
| IDOR               | Missing user identity                  | `401 Unauthorized`       | ✅         |
| IDOR               | Invalid order ID                       | `400 Bad Request`        | ✅         |
| Rate Limit         | Repeated failed login attempts         | `429 Too Many Requests`  | ✅         |
| Email Enumeration  | Existing/non-existing email comparison | Generic response         | ✅         |
| Open Redirect      | External URL                           | `400 Bad Request`        | ✅         |
| Open Redirect      | Protocol-relative URL                  | `400 Bad Request`        | ✅         |
| Open Redirect      | JavaScript URL                         | `400 Bad Request`        | ✅         |
| Open Redirect      | Valid internal redirect                | `307 Temporary Redirect` | ✅         |
| Open Redirect      | Missing URL                            | `400 Bad Request`        | ✅         |
| Finding Validation | Correct security finding               | Score `100`              | ✅         |
| Finding Validation | Incorrect finding                      | Score `0`                | ✅         |
| Race Condition     | Concurrent coupon redemption           | Only one succeeds        | ✅         |

---

## 🔄 Security Regression Strategy

The project follows a repeatable security regression workflow:

```text
Security Risk / Vulnerability
          ↓
Manual Reproduction
          ↓
Security Test Scenario
          ↓
Playwright Automation
          ↓
Application Security Fix
          ↓
Regression Test
          ↓
Allure Report
          ↓
CI/CD Validation
```

The goal is not only to identify a vulnerability once, but to ensure that the corresponding security control continues to work after future code changes.

---

## 🚀 CI/CD

Security tests are executed through **GitHub Actions** on:

* Push
* Pull Request

The CI pipeline performs:

```text
Checkout Repository
        ↓
Setup Node.js
        ↓
Install Dependencies
        ↓
Install Playwright Browsers
        ↓
Start PostgreSQL
        ↓
Initialize Database
        ↓
Seed Deterministic Test Data
        ↓
Start Next.js
        ↓
Probe API Routes
        ↓
Run Security Tests
```

The CI environment uses deterministic test data so that security tests can run consistently across environments.

The security suite is intended to act as a regression gate against security-related application changes.

---

## 🛠 Tech Stack

### Application

* Next.js 16
* TypeScript
* PostgreSQL
* Prisma ORM

### Testing

* Playwright
* API Testing
* Security Testing
* Regression Testing
* Concurrency Testing

### Security Scenarios

* IDOR / Broken Access Control
* Rate Limiting
* Email Enumeration
* Open Redirect
* Race Condition

### Reporting

* Allure Playwright
* Allure Commandline

### DevOps

* Git
* GitHub Actions
* CI/CD

---

## 📁 Project Structure

```text
qa-security-lab/
├── .github/
│   └── workflows/
│       └── security-tests.yml
│
├── src/
│   ├── app/
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── check-email/
│   │       │   └── login/
│   │       ├── challenges/
│   │       │   └── [slug]/
│   │       ├── coupons/
│   │       │   └── redeem/
│   │       ├── findings/
│   │       ├── orders/
│   │       │   └── [id]/
│   │       └── redirect/
│   │
│   ├── lib/
│   │   ├── db.ts
│   │   └── pg.ts
│   │
│   └── prisma/
│       ├── contract.prisma
│       ├── contract.json
│       └── contract.d.ts
│
├── tests/
│   └── security/
│       ├── config/
│       │   └── test-data.ts
│       ├── helpers/
│       │   └── security.ts
│       ├── email-enumeration.spec.ts
│       ├── finding.spec.ts
│       ├── idor.spec.ts
│       ├── open-redirect.spec.ts
│       ├── race-condition.spec.ts
│       └── rate-limit.spec.ts
│
├── SECURITY-TEST-REPORT.md
├── seed.mjs
├── reset-seed.mjs
├── playwright.config.ts
└── prisma.config.ts
```

---

## ⚙️ Getting Started

### Prerequisites

Make sure you have:

* Node.js 22+
* PostgreSQL
* npm
* Java 17+ for Allure Commandline

### 1. Clone the repository

```bash
git clone https://github.com/archndrx/qa-security-lab.git
cd qa-security-lab
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create `.env`:

```env
DATABASE_URL="postgresql://qasecurity:qasecurity@localhost:5432/qasecuritylab?schema=public"
IDOR_SECURITY_FIX=true
```

### 4. Initialize the database

```bash
npx prisma db init --db "$DATABASE_URL"
```

### 5. Seed test data

```bash
node reset-seed.mjs
node seed.mjs
```

The deterministic seed creates:

```text
Alice
  ├── Order #1 - MacBook
  └── Order #2 - Keyboard

Bob
  ├── Order #3 - Monitor
  └── Order #4 - Mouse

Coupon
  └── DISCOUNT50
```

The race-condition test itself creates an isolated coupon so that it does not depend on the seeded coupon state.

### 6. Start the application

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

### 7. Run security tests

```bash
npx playwright test tests/security
```

### 8. Generate Allure report

```bash
npx allure generate allure-results --clean -o allure-report
```

---

## 🧩 Test Data

Test data is intentionally deterministic so that automated tests produce consistent results locally and in CI.

```text
Users
├── test-alice
└── test-bob

Orders
├── #1 Alice - MacBook
├── #2 Alice - Keyboard
├── #3 Bob   - Monitor
└── #4 Bob   - Mouse

Challenges
├── test-challenge-idor
├── test-challenge-rate-limit
└── test-challenge-email-enumeration

Coupon
└── DISCOUNT50
```

The race-condition test uses a unique generated coupon per execution and removes it during cleanup.

---

## 📊 QA Perspective

This project treats security testing as part of the QA lifecycle rather than as a completely separate activity.

The testing approach includes:

```text
Security Requirement / Risk
          ↓
Test Scenario
          ↓
Positive / Negative / Edge Cases
          ↓
API Validation
          ↓
Security Regression
          ↓
Automated Reporting
          ↓
CI/CD
```

The project demonstrates practical QA activities such as:

* Security test scenario design
* Positive and negative testing
* API testing
* HTTP status validation
* Authorization testing
* Concurrency testing
* Database state validation
* Security regression testing
* Test data management
* Automated test execution
* Allure reporting
* CI/CD integration

---

## 🗺️ Roadmap

### Completed

* [x] IDOR / Broken Access Control
* [x] Rate Limit
* [x] Email Enumeration
* [x] Open Redirect
* [x] Finding & Scoring
* [x] Race Condition
* [x] Playwright security regression tests
* [x] CI/CD security test execution
* [x] Allure security test reporting

### Planned

* [ ] Mass Assignment
* [ ] Sensitive Data Exposure
* [ ] Role-based Access Control / Privilege Escalation
* [ ] Expanded API security scenarios
* [ ] Expanded CI security gates
* [ ] Security test evidence and attachments
* [ ] AI-assisted security test generation
* [ ] Automated security test case generation from requirements
* [ ] AI-assisted security test result summarization

---

## ⚠️ Disclaimer

This project is an educational security testing playground.

The vulnerabilities and security scenarios are intentionally simplified for learning and QA automation purposes. It should not be considered a production-ready security implementation.

---

## 👤 Author

Built as a QA Engineering portfolio project focused on:

**Quality Assurance · API Testing · Security Testing · Test Automation · CI/CD · Security Automation**
