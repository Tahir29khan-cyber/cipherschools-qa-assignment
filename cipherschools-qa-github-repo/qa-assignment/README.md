# CipherSchools QA Engineer Intern — Practical Assignment

> **App Under Test:** https://with-bugs.practicesoftwaretesting.com  
> **Tester:** [Your Name]  
> **Submission includes:** Deliverables 1–3 (Word doc) + Deliverable 4 (this repo)

---

## Repository Structure

```
├── e2e/
│   └── learner-journey.spec.js     # Playwright E2E automation (D4a)
├── load/
│   ├── jmeter/
│   │   ├── search-api-plan.jmx     # JMeter test plan (D4b)
│   │   ├── keywords.csv            # Search keyword data
│   │   └── results.jtl             # Generated after running JMeter
│   └── k6/
│       ├── search-load-test.js     # k6 load simulation script (D4b)
│       └── results-summary.json    # Generated after running k6
├── config/
│   └── .env.example                # Environment variable template
├── playwright.config.js            # Playwright configuration
├── package.json
└── README.md
```

---

## Quick Setup

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/cipherschools-qa-assignment.git
cd cipherschools-qa-assignment
npm install
npx playwright install chromium
```

### 2. Environment Config

```bash
cp config/.env.example config/.env
# Edit config/.env if needed (defaults point to the practice app)
```

---

## Deliverable 4a — E2E Automation (Playwright)

**Tool:** Playwright (Node.js / `@playwright/test`)

### What it tests (Learner Journey):
1. Register a new user account with unique email
2. Login with newly registered credentials
3. Search for a product ('Pliers') and open its detail page
4. Add the product to cart
5. **Assert: basket item count increments** ← This assertion FAILS if enrollment flow is broken

### Run the tests:

```bash
# Headless (default - for CI)
npm run test:e2e

# Headed (watch in browser)
npm run test:e2e:headed

# View HTML report after run
npm run test:e2e:report
```

### Expected output:
```
✅ Registered: learner.test.1234567890@mailtest.com
✅ Login successful
✅ Product detail page opened
✅ Cart count incremented: 0 → 1

4 passed (45s)
```

---

## Deliverable 4b — Load Testing

### JMeter (GUI-based API test plan)

**Requires:** Apache JMeter 5.6+ — [Download](https://jmeter.apache.org/download_jmeter.cgi)

#### What it tests:
- `GET /api/v1/products/search` with random keywords
- 10 concurrent users for 60 seconds
- 3 assertions: Status 200, Response time <2000ms, Body contains `"data"`

#### Run via GUI:
```bash
# Open JMeter GUI
jmeter

# File → Open → load/jmeter/search-api-plan.jmx
# Click Run (green ▶ button)
# View results in "Summary Report" listener
```

#### Run via CLI (headless):
```bash
jmeter -n \
  -t load/jmeter/search-api-plan.jmx \
  -l load/jmeter/results.jtl \
  -e -o load/jmeter/report
```

---

### k6 (Code-based load simulation)

**Requires:** k6 — [Install](https://k6.io/docs/getting-started/installation/)

#### What it tests:
- 20 virtual users hitting the search endpoint
- Ramp up 10s → Hold 30s → Ramp down 10s
- **Thresholds:** 95th percentile < 2000ms, error rate < 1%

#### Run:
```bash
k6 run load/k6/search-load-test.js
```

#### Expected threshold summary:
```
✓ http_req_duration.............: p(95)<2000ms ✓
✓ http_req_failed...............: rate<0.01    ✓
```

---

### Prometheus Metrics (k6 → Prometheus remote write)

**Requires:** Prometheus running locally on port 9090

#### Step 1: Start Prometheus
```bash
# Download prometheus from https://prometheus.io/download/
./prometheus --config.file=prometheus.yml
```

#### Step 2: Run k6 with remote write output
```bash
K6_PROMETHEUS_RW_SERVER_URL=http://localhost:9090/api/v1/write \
  k6 run --out=experimental-prometheus-rw load/k6/search-load-test.js
```

#### Step 3: View metrics in Prometheus UI
1. Open http://localhost:9090
2. Query: `k6_http_req_duration_p95` or `k6_http_reqs_total`
3. Screenshot the graph for submission

> **Note:** If `experimental-prometheus-rw` is not available in your k6 build, use:
> ```bash
> k6 run --out json=load/k6/results.json load/k6/search-load-test.js
> ```

---

## Environment Variables Reference

| Variable | Description | Default |
|---|---|---|
| `BASE_URL` | App under test URL | `https://with-bugs.practicesoftwaretesting.com` |
| `TEST_EMAIL` | Existing test account email | `customer@practicesoftwaretesting.com` |
| `TEST_PASSWORD` | Existing test account password | `welcome01` |
| `LOAD_TEST_HOST` | Host for load tests | `with-bugs.practicesoftwaretesting.com` |
| `PROMETHEUS_REMOTE_WRITE` | Prometheus write endpoint | `http://localhost:9090/api/v1/write` |

---

## Manual Testing Deliverables (D1–D3)

See the submitted Word document: `CipherSchools_QA_Assignment.docx`

Contains:
- **D1:** 30 structured test cases across M1/M2/M3
- **D2:** 10 formal bug reports with steps to reproduce
- **D3:** Test summary report + reflection

---

## Key Bugs Found

| Bug ID | Severity | Title |
|---|---|---|
| BUG-001 | High | Price sorting produces incorrect order |
| BUG-002 | High | Empty password not validated client-side on login |
| BUG-003 | High | Cart allows quantity 0 — proceeds to checkout |
| BUG-004 | Medium | Checkout accessible directly with empty cart via URL |
| BUG-005 | High | XSS input reflected unsanitised in search results heading |
| BUG-006 | High | Expired credit card accepted at checkout |
| BUG-007 | Medium | Logout doesn't fully invalidate session on browser back |
| BUG-008 | Medium | Cart cleared after logout + re-login |
| BUG-009 | Medium | Price range filter includes out-of-range products |
| BUG-010 | Medium | Registration accepts 3-character password |

---

## Notes

- All load tests are run **only** against the designated practice app URL — never against production systems
- The E2E test generates a unique email per run to avoid conflicts with the duplicate-email bug (BUG registered separately)
- Screenshots of failed test cases were captured during manual testing and are embedded in the Word document
