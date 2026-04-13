# Currency Module

Handles exchange-rate retrieval, conversion, and scheduled refresh for the Matsak API.

---

## Architecture

```
ExchangeRate-API (external)
        │  called once per day
        ▼
ExchangeRateFetcher.fetchAndStore()
        │  writes JSON + 25h TTL
        ▼
      Redis  ◄──── ExchangeRateRefreshJob  (@Cron 01:00 UTC daily)
        │                                  (OnApplicationBootstrap warm-up)
        │  reads
        ▼
  CurrencyService
   ├─ 1. in-process memory cache (60 s TTL)  ← hot path, zero I/O
   ├─ 2. Redis read                           ← normal path
   └─ 3. ExchangeRateFetcher fallback         ← cold-start only
```

### Files

| File | Responsibility |
|---|---|
| `exchange-rate.fetcher.ts` | HTTP call → ExchangeRate-API, Redis write |
| `exchange-rate-refresh.job.ts` | `@Cron` trigger + bootstrap warm-up |
| `currency.service.ts` | Read-only: cache lookup, convert, getEurRate |
| `currency.module.ts` | Module wiring |

---

## Setup

### 1. Get a free API key

Sign up at <https://app.exchangerate-api.com/sign-up>.  
The free tier provides **1 500 requests/month** — the daily cron uses **1 request/day (~30/month)**.

### 2. Add the key to your environment file

```env
# .env  (or .env.docker for Docker deployments)
EXCHANGERATE_API_KEY=your_key_here
```

> **Required.** The application will refuse to start with a clear error if this variable is missing.

### 3. Ensure Redis is running

The cron job writes rates to Redis. Both local and Docker setups depend on it.

```bash
# Local (bare metal)
redis-server

# or via Docker Compose
docker compose up -d redis
```

---

## How the cron job works

### Trigger schedule

The job runs **every day at 01:00 UTC** (`CronExpression.EVERY_DAY_AT_1AM`), which aligns with ExchangeRate-API's daily data update cycle.

```typescript
@Cron(CronExpression.EVERY_DAY_AT_1AM, {
  name: 'refresh-exchange-rates',
  timeZone: 'UTC',
})
async handleDailyRefresh(): Promise<void> { ... }
```

### Bootstrap warm-up

On every application start, `ExchangeRateRefreshJob` implements `OnApplicationBootstrap`.  
It checks Redis first:

- **Redis is empty** → calls `fetchAndStore()` immediately so the first real request is served from cache.
- **Redis already has data** → skips the fetch (avoids wasting API quota on restarts).

### Failure behaviour

| Scenario | Behaviour |
|---|---|
| Cron fetch fails | Error is logged; **stale data remains in Redis**; retried next day |
| Bootstrap fetch fails | Warning is logged; app starts normally; first request triggers on-demand fetch |
| Redis unavailable | `CurrencyService` falls back to on-demand fetch directly; logs a warning |
| API key invalid / quota exceeded | `InternalServerErrorException` thrown with the API error type |

### Redis TTL

Rates are stored with a **25-hour TTL** (`CACHE_TTL_SECONDS = 90_000`).  
This is intentionally longer than the 24-hour cron interval to keep data alive if a single cron run is delayed or fails.

---

## Running and monitoring the cron job

### Local development

Start the app normally — the cron scheduler starts automatically with `ScheduleModule.forRoot()`:

```bash
pnpm start:dev
```

You will see log lines like:

```
[ExchangeRateRefreshJob] No cached rates found on startup — fetching now
[ExchangeRateFetcher]    Exchange rates stored (170 currencies, date: ...)
```

Or on subsequent restarts:

```
[ExchangeRateRefreshJob] Exchange rates already cached — skipping bootstrap fetch
```

At 01:00 UTC every day:

```
[ExchangeRateRefreshJob] Starting daily exchange rate refresh
[ExchangeRateFetcher]    Exchange rates stored (170 currencies, date: ...)
[ExchangeRateRefreshJob] Daily exchange rate refresh complete (date: ...)
```

### Triggering the cron manually (for testing / ops)

Inject `ExchangeRateFetcher` and call `fetchAndStore()` directly, or add a protected admin endpoint:

```typescript
// Example: protected admin endpoint to force a refresh
@Post('currency/refresh')
@UseGuards(AdminGuard)
async forceRefresh(): Promise<void> {
  await this.exchangeRateFetcher.fetchAndStore();
}
```

Or from a one-off script:

```bash
# Inspect current Redis cached rates
redis-cli GET currency:rates:eur | jq '.date, (.rates | keys | length)'
```

### Docker

The scheduler runs inside the same NestJS container — no separate worker process required.

```bash
docker compose up -d
# watch logs
docker compose logs -f api | grep -i "exchange rate"
```

---

## Cache keys

| Key | Content | TTL |
|---|---|---|
| `currency:rates:eur` | JSON `ExchangeRates` object (all conversion rates from EUR) | 25 h |

---

## Changing the cron schedule

Edit `exchange-rate-refresh.job.ts`:

```typescript
// Every day at 01:00 UTC (default)
@Cron(CronExpression.EVERY_DAY_AT_1AM, { name: 'refresh-exchange-rates', timeZone: 'UTC' })

// Every 12 hours
@Cron('0 */12 * * *', { name: 'refresh-exchange-rates', timeZone: 'UTC' })

// Every Monday at 08:00 Paris time
@Cron('0 8 * * 1', { name: 'refresh-exchange-rates', timeZone: 'Europe/Paris' })
```

> **Note:** ExchangeRate-API updates rates once per day. Running more frequently than daily does not provide fresher data on the free plan.

---

## Running unit tests

```bash
# All currency tests
pnpm test --testPathPattern="src/currency" --no-coverage

# Watch mode during development
pnpm test --testPathPattern="src/currency" --watch
```

### Test coverage

| Spec file | What is tested |
|---|---|
| `currency.service.spec.ts` | Cache hierarchy (memory → Redis → fallback), convert, getEurRate, listCurrencies |
| `exchange-rate.fetcher.spec.ts` | HTTP fetch, Redis write, error handling (network failure, API error response, Redis write failure) |
| `exchange-rate-refresh.job.spec.ts` | Bootstrap warm-up (empty vs populated cache), daily cron trigger, non-fatal failure behaviour |
