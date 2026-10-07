[![Security Tests](https://github.com/archndrx/qa-security-lab/actions/workflows/security-tests.yml/badge.svg)](https://github.com/archndrx/qa-security-lab/actions/workflows/security-tests.yml)

# QA Security Playground

A security-focused testing playground built to demonstrate **security testing, API testing, automated regression testing, and CI/CD integration** from a QA Engineer perspective.

The project contains security scenarios based on common web application vulnerabilities, with automated tests used to validate both vulnerable behavior and security fixes.

## 🎯 Project Goals

This project demonstrates how a QA Engineer can:

* Identify common web application security vulnerabilities
* Design security-focused test scenarios
* Automate security regression tests with Playwright
* Validate API behavior and HTTP responses
* Verify that security fixes remain effective
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

---

### 2. Rate Limit

Tests whether the login endpoint prevents unlimited authentication attempts.

Expected behavior:

```text
Attempt 1–5 → 401 Unauthorized
Attempt 6+   → 429 Too Many Requests
```

The Playwright test verifies that the endpoint eventually returns `429`.

---

### 3. Email Enumeration

Tests whether an attacker can determine whether an email address is registered.

The vulnerable behavior exposes different responses for existing and non-existing accounts.

The fixed implementation returns the same response structure for both cases.

Automated regression verifies that:

```text
Existing email     → 200
Non-existing email → 200
```

and neither response reveals account existence.

---

### 4. Open Redirect

Tests whether an attacker can manipulate a redirect parameter to redirect users to an external website.

**Vulnerable behavior:**

```text
/api/redirect?url=https://evil.example.com
                    ↓
              307 Redirect
                    ↓
          https://evil.example.com
```

The fixed implementation only allows internal relative paths.

Expected behavior:

```text
/dashboard                  → 307 Redirect
https://evil.example.com   → 400 Bad Request
//evil.example.com         → 400 Bad Request
javascript:alert(1)        → 400 Bad Request
```

Automated regression covers:

* External URL
* Protocol-relative URL
* JavaScript URL
* Valid internal path
* Missing redirect URL

---

### 5. Finding & Scoring

The playground also contains a finding submission and scoring mechanism.

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

This demonstrates API validation and end-to-end verification of application behavior.

---

## 🧪 Automated Security Testing

Security regression tests are implemented using **Playwright**.

Current test coverage:

| Area                         |  Tests |
| ---------------------------- | -----: |
| IDOR / Broken Access Control |      5 |
| Rate Limit                   |      1 |
| Finding & Scoring            |      3 |
| Email Enumeration            |      1 |
| Open Redirect                |      5 |
| **Total**                    | **15** |

Run the complete security suite:

```bash
npx playwright test tests/security
```

Current result:

```text
Running 15 tests using 5 workers

15 passed
```

---

## 🔎 Security Test Coverage

| Vulnerability      | Attack Scenario                    | Expected Result          | Automated |
| ------------------ | ---------------------------------- | ------------------------ | --------- |
| IDOR               | User accesses another user's order | `403 Forbidden`          | ✅         |
| IDOR               | User accesses own order            | `200 OK`                 | ✅         |
| IDOR               | Missing user identity              | `401 Unauthorized`       | ✅         |
| IDOR               | Invalid order ID                   | `400 Bad Request`        | ✅         |
| Rate Limit         | Repeated failed login attempts     | `429 Too Many Requests`  | ✅         |
| Email Enumeration  | Check existing/non-existing email  | Same response            | ✅         |
| Open Redirect      | Redirect to external URL           | `400 Bad Request`        | ✅         |
| Open Redirect      | Protocol-relative redirect         | `400 Bad Request`        | ✅         |
| Open Redirect      | JavaScript URL                     | `400 Bad Request`        | ✅         |
| Open Redirect      | Valid internal redirect            | `307 Temporary Redirect` | ✅         |
| Finding Validation | Submit valid security finding      | Score `100`              | ✅         |
| Finding Validation | Submit invalid finding             | Score `0`                | ✅         |

---

## 🔄 Security Regression Strategy

The project follows a simple security regression workflow:

```text
Security Vulnerability
        ↓
Manual Reproduction
        ↓
Security Test Scenario
        ↓
Playwright Automation
        ↓
Application Fix
        ↓
Regression Test
        ↓
CI/CD Validation
```

The goal is not only to identify a vulnerability once, but to ensure that a security fix continues to work after future code changes.

---

## 🚀 CI/CD

Security tests are automatically executed through **GitHub Actions** on:

* Push
* Pull Request

The CI pipeline:

```text
Checkout Repository
        ↓
Setup Node.js
        ↓
Install Dependencies
        ↓
Install Playwright
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

The CI environment uses the same deterministic test data as local development, allowing the security suite to run consistently across environments.

---

## 🛠 Tech Stack

### Application

* Next.js
* TypeScript
* PostgreSQL
* Prisma ORM

### Testing

* Playwright
* API Testing
* Security Testing
* Regression Testing

### Security Scenarios

* IDOR / Broken Access Control
* Rate Limiting
* Email Enumeration
* Open Redirect
* Authentication-related testing

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
│   │       ├── findings/
│   │       ├── orders/
│   │       │   └── [id]/
│   │       └── redirect/
│   │
│   ├── lib/
│   │   └── db.ts
│   │
│   └── prisma/
│       └── contract.prisma
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
│       └── rate-limit.spec.ts
│
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

The seed creates deterministic test data:

```text
Alice
  ├── Order #1 - MacBook
  └── Order #2 - Keyboard

Bob
  ├── Order #3 - Monitor
  └── Order #4 - Mouse
```

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

---

## 🧩 Test Data

Test data is intentionally deterministic so that automated tests produce consistent results locally and in CI.

```text
User
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
```

This avoids tests depending on randomly generated database IDs.

---

## 📊 QA Perspective

This project focuses on security testing as part of the QA lifecycle rather than treating security as a separate activity.

The testing approach includes:

```text
Requirement / Security Risk
          ↓
Test Scenario
          ↓
Positive / Negative Cases
          ↓
API Validation
          ↓
Security Regression
          ↓
CI/CD
```

The project demonstrates practical QA activities such as:

* Test scenario design
* Positive and negative testing
* API testing
* HTTP status validation
* Security regression testing
* Test data management
* Automated test execution
* CI/CD integration

---

## 🗺️ Roadmap

Planned improvements:

* [x] IDOR / Broken Access Control
* [x] Rate Limit
* [x] Email Enumeration
* [x] Open Redirect
* [x] Security regression tests
* [x] CI/CD security test execution
* [ ] Race Condition challenge
* [ ] Additional API security scenarios
* [ ] Security test reporting
* [ ] Allure test reports
* [ ] Expanded CI security gates
* [ ] AI-assisted security test generation

---

## ⚠️ Disclaimer

This project is an educational security testing playground.

The vulnerabilities and security scenarios are intentionally simplified for learning and QA automation purposes. It should not be considered a production-ready security implementation.

---

## 👤 Author

Built as a QA Engineering portfolio project focused on:

**Quality Assurance · API Testing · Security Testing · Test Automation · CI/CD**
