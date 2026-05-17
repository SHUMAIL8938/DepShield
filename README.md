# DepShield 🛡️

**Multi-ecosystem dependency vulnerability scanner with real-time threat intelligence.**

Paste your manifest file or point at a GitHub repo → get a full security audit: vulnerabilities, outdated packages, license audit, health score, and a live threat feed — all powered by the free OSV.dev database.

**Live demo:** [your-depshield.vercel.app](https://your-depshield.vercel.app)

---

## Features

- **Multi-ecosystem** — npm, PyPI, Maven, RubyGems, Go, Packagist, crates.io
- **Real vulnerability data** — powered by [OSV.dev](https://osv.dev), updated every 6 hours
- **Health score** — algorithmic scoring with letter grades (A–F)
- **Outdated package detection** — checks npm registry and PyPI for latest versions
- **License audit** — surfaces GPL, AGPL, and unknown licenses
- **GitHub webhook** — auto-scan on every push, HMAC-verified
- **Live threat feed** — homepage shows recently compromised packages
- **Terminal UI** — retro CRT aesthetic with scanlines and green-on-black

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, TailwindCSS, Recharts |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas |
| Auth | JWT (access + refresh tokens), HTTP-only cookies |
| Vulnerability DB | OSV.dev (free, no API key needed) |
| Package registry | npm registry API, PyPI JSON API |
| Real-time feed | node-cron (every 6 hours) |
| Webhook security | HMAC-SHA256 signature verification |
| Deploy | Vercel (frontend) + Railway (backend) |

---

## Local Development

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier)

### Setup

```bash
# Clone and install
git clone https://github.com/yourusername/depshield
cd depshield
npm run install:all

# Configure backend
cd server
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secrets

# Run both servers
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd client && npm run dev
```

Frontend runs on `http://localhost:5173`
Backend runs on `http://localhost:5000`

### Environment Variables (server/.env)

```env
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/depshield
JWT_SECRET=generate_with_openssl_rand_hex_32
JWT_REFRESH_SECRET=another_random_secret
CLIENT_URL=http://localhost:5173
GITHUB_WEBHOOK_SECRET=any_random_string
SERVER_URL=https://your-railway-url.railway.app
```

---

## Deployment

### Backend → Railway

1. Create account at [railway.app](https://railway.app)
2. New Project → Deploy from GitHub → select `depshield/server`
3. Add environment variables in Railway dashboard
4. Copy your Railway URL (e.g. `https://depshield-production.up.railway.app`)
5. Set `SERVER_URL` to this URL in your Railway env vars

### Frontend → Vercel

1. Create account at [vercel.com](https://vercel.com)
2. New Project → Import `depshield/client`
3. Framework: Vite
4. Add env var: `VITE_API_URL` = your Railway URL
5. Update `client/src/utils/api.js` baseURL if needed
6. Deploy

---

## API Endpoints

```
POST   /api/auth/register          Register new user
POST   /api/auth/login             Login
POST   /api/auth/refresh           Refresh access token
POST   /api/auth/logout            Logout
GET    /api/auth/me                Get current user

POST   /api/scan                   Run a new scan
GET    /api/scan                   Get scan history (paginated)
GET    /api/scan/:id               Get single scan result
DELETE /api/scan/:id               Delete a scan

GET    /api/feed                   Get live vulnerability feed (public)

POST   /api/webhook/register       Register GitHub webhook
GET    /api/webhook                List user webhooks
DELETE /api/webhook/:id            Delete webhook
POST   /api/webhook/github         GitHub webhook receiver (HMAC verified)
```

---

## Security

- **Rate limiting** — 100 req/15min global, 10 req/15min auth, 5 scans/min
- **SSRF protection** — blocks private IPs, localhost, cloud metadata endpoints
- **Input validation** — manifest size limit (500KB), URL validation
- **JWT security** — 15min access tokens, 7-day HTTP-only refresh cookies
- **Webhook verification** — HMAC-SHA256 signature check on every GitHub event
- **Helmet.js** — secure HTTP headers
- **CORS** — locked to frontend domain only

---

## Health Score Algorithm

```
Start: 100 points

CRITICAL vulnerability  → -20 each (max -40)
HIGH vulnerability      → -10 each (max -20)
MEDIUM vulnerability    → -5  each (max -10)
LOW vulnerability       → -1  each (max -5)
Major version outdated  → -3  each (max -15)
Minor version outdated  → -1  each (max -5)

Floor: 0

Grade: A (90-100) · B (75-89) · C (60-74) · D (40-59) · F (0-39)
```

---

## License

MIT
