# Distributed Token Bucket Rate Limiter

A high-performance, atomic Token Bucket rate limiter built with **Node.js (Express)**, **Redis**, and a **React + Tailwind CSS** real-time monitoring console.

---

## Live Demo URLs

| Component | URL | Notes |
| :--- | :--- | :--- |
| **Frontend UI** | [https://rate-limiter-ui.onrender.com](https://rate-limiter-ui.onrender.com) | Live traffic simulator & quota gauge *(replace with your Render URL)* |
| **Backend API** | [https://rate-limiter-api.onrender.com](https://rate-limiter-api.onrender.com) | Express + Redis rate-limited API *(replace with your Render URL)* |

---

## 1. System Architecture & Concurrency Model

### Token Bucket Algorithm
Each client receives a bucket with maximum capacity $C$ (`BUCKET_CAPACITY = 10`), refilling continuously at rate $R$ (`REFILL_RATE = 0.5` tokens/sec):
- **Allowed**: If tokens remain ($\ge 1$), the request is accepted (`200 OK`), consuming 1 token.
- **Throttled**: When empty ($< 1$), the request is rejected (`429 Too Many Requests`) with a `Retry-After` header indicating seconds until 1 token is available.

### Why Redis Hash + Atomic Lua Script Prevents Race Conditions
In distributed environments, standard application-level rate limiters suffer from **Check-Then-Act (Read-Modify-Write)** race conditions:
1. Two simultaneous requests ($A$ and $B$) for the same client hit different servers or worker threads.
2. Both read `tokens = 1`.
3. Both calculate that 1 token is available, decrement to `0`, and write back to storage.
4. **Outcome**: Both requests pass, over-granting quota beyond the configured limit.

```
Without Lua (Race Condition):
Thread A: --- Read (tokens=1) ------------ Write (tokens=0) -> Allowed (200)
Thread B: ------- Read (tokens=1) ------------ Write (tokens=0) -> Allowed (200) [Over-grant!]

With Redis Lua Script:
Requests A & B: -> [ Redis Engine (Single-Threaded, Atomic EVAL) ] -> A: Allowed (200), B: Blocked (429)
```

**Solution**:
- **Single-Threaded Atomicity**: Redis executes Lua scripts via `EVAL` as an uninterruptible atomic transaction. No other Redis command or script can interleave.
- **Single Round-Trip**: Refilling tokens based on elapsed millisecond time, checking availability, updating the hash, and resetting the key TTL are completed in a single atomic operation without distributed locks.

---

## 2. Redis Data Model Schema & TTL Policy

Client states are stored as Redis Hashes:

### Key Format
```text
rate_limit:<clientId>
```
*Example*: `rate_limit:user-a`, `rate_limit:203.0.113.195` (falls back to `req.ip` via `trust proxy`).

### Hash Fields
| Field | Type | Description |
| :--- | :--- | :--- |
| `tokens` | `float` / `string` | Current fractional token count, clamped between `0` and `BUCKET_CAPACITY`. |
| `last_refill` | `integer` / `string` | Millisecond Unix timestamp (`Date.now()`) of the most recent token calculation. |

### TTL Policy
To prevent memory leaks from one-off or inactive clients, the Lua script assigns a dynamic TTL on every request:

$$\text{TTL} = \left\lceil \frac{\text{capacity}}{\text{refill\_rate}} \times 2 \right\rceil \text{ seconds}$$

For default values ($\text{capacity} = 10$, $\text{refill\_rate} = 0.5$ tokens/sec):
$$\text{TTL} = \left\lceil \frac{10}{0.5} \times 2 \right\rceil = 40 \text{ seconds}$$

- **Automatic Garbage Collection**: Inactive keys expire naturally from Redis after 40 seconds.
- **Continuous Retention**: Active clients reset their TTL with each request, maintaining unbroken state.

---

## 3. Local Setup Instructions

### Prerequisites
- Node.js 18+
- Redis 7+ (or Docker)

### Option A: Manual Setup using `backend/.env.example`

1. **Configure Environment Variables**:
   ```bash
   cp backend/.env.example backend/.env
   ```
   *(On Windows PowerShell: `Copy-Item backend\.env.example backend\.env`)*

   Default `backend/.env`:
   ```env
   PORT=5000
   REDIS_URL=redis://localhost:6379
   BUCKET_CAPACITY=10
   REFILL_RATE=0.5
   FRONTEND_URL=http://localhost:5173
   ```

2. **Start Backend**:
   ```bash
   cd backend
   npm install
   npm start
   ```

3. **Start Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Access the dashboard at [http://localhost:5173](http://localhost:5173).

---

### Option B: Docker Compose

Start Redis, the backend, and the frontend with one command:
```bash
docker compose up --build
```
- **Frontend Dashboard**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **Redis Server**: `localhost:6379`

---

## 4. API Verification with `curl`

Test against your deployed Render API (or `http://localhost:5000` locally):

```bash
# Set your target endpoint
API_URL="https://rate-limiter-api.onrender.com"
```

### 1. Successful Request (`200 OK`)
```bash
curl -i -H "X-Client-Id: user-1" "$API_URL/api/data"
```

**Response**:
```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
Retry-After: 0
Content-Type: application/json; charset=utf-8

{
  "message": "Request accepted",
  "clientId": "user-1",
  "timestamp": "2026-11-24T17:15:00.000Z"
}
```

### 2. Burst Request Exceeding Capacity (`429 Too Many Requests`)

Send 12 rapid requests to exhaust the 10-token capacity:

#### Bash (Linux / macOS)
```bash
for i in {1..12}; do
  curl -i -s -H "X-Client-Id: user-burst" "$API_URL/api/data" | grep -E "HTTP|X-RateLimit|Retry-After"
done
```

#### PowerShell (Windows)
```powershell
1..12 | ForEach-Object {
  curl.exe -i -s -H "X-Client-Id: user-burst" "$API_URL/api/data" | Select-String "HTTP|X-RateLimit|Retry-After|error"
}
```

**Throttled Response (Requests 11 & 12)**:
```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
Retry-After: 2
Content-Type: application/json; charset=utf-8

{
  "error": "Too Many Requests",
  "retryAfter": 2,
  "clientId": "user-burst"
}
```

---

## 5. Deployment Blueprint (Render)

This repository includes a [`render.yaml`](./render.yaml) Blueprint configured for Render's free tier:
- **`rate-limiter-api`**: Node.js web service running from `backend/` with `trust proxy: 1`.
- **`rate-limiter-ui`**: Static site built from `frontend/` with SPA rewrite rules (`/* -> /index.html`).
- **External Redis**: Connects via `REDIS_URL` (supporting Redis Cloud SSL with automatic `rediss://` TLS detection).
