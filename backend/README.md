# EcoMetrix Backend

Backend za EcoMetrix — REST API za praćenje potrošnje energije u kućanstvima. Koristi Express.js, MySQL i JWT auth. Podržava integraciju sa **Shelly Plug S Gen3** utičnicama za automatsko mjerenje potrošnje.

## Tech stack

Express.js 5 · MySQL 2 · bcrypt · JWT · node-cron · winston · simple-statistics

## Preduvjeti

- Node.js 18+
- MySQL 8.0+
- Shelly Plug S Gen3 (opcionalno)

## Setup

```bash
npm install
cp .env.example .env
```

Uredi `.env` sa svojim podacima za bazu, JWT secret itd.

Zatim kreiraj bazu:

```bash
mysql -u root -p < ../ecometrix_schema.sql
mysql -u root -p ecometrix < db_migration_add_ip.sql
```

## Pokretanje

```bash
npm run dev    # development (nodemon)
npm start      # production
```

Server sluša na `http://localhost:4000`.

## Shelly integracija

Detalji u [SHELLY_INTEGRATION.md](./SHELLY_INTEGRATION.md).

Ukratko:
1. Spoji Shelly utičnicu na WiFi
2. Kreiraj uređaj i pridruži mu utičnicu s njenom IP adresom
3. Server automatski prikuplja podatke po cron rasporedu (default: svakih 5 min)

Primjer pridruživanja utičnice:
```bash
curl -X POST http://localhost:4000/api/devices/1/plug \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "serijski_broj": "ShellyPlugSG3-123456",
    "ip_adresa": "192.168.1.100",
    "proizvodjac": "Shelly",
    "model": "Plug S Gen3"
  }'
```

## API rute

**Auth**
- `POST /api/auth/register` — registracija
- `POST /api/auth/login` — prijava
- `GET /api/auth/me` — trenutni korisnik

**Kućanstva**
- `GET /api/households` — lista
- `POST /api/households` — novo kućanstvo
- `GET /api/households/:id` — detalji
- `GET /api/households/:id/rooms` — prostorije
- `POST /api/households/:id/rooms` — nova prostorija

**Uređaji**
- `GET /api/households/:id/devices` — lista uređaja
- `POST /api/households/:id/devices` — novi uređaj
- `GET /api/devices/:deviceId` — detalji uređaja
- `GET|POST|PUT /api/devices/:deviceId/plug` — upravljanje utičnicom

**Mjerenja**
- `GET /api/households/:id/measurements` — sva mjerenja
- `GET /api/households/:id/stats` — statistika
- `POST /api/households/:id/collect-all` — prikupi sa svih uređaja
- `GET /api/devices/:deviceId/measurements` — mjerenja uređaja
- `POST /api/devices/:deviceId/collect` — prikupi podatke
- `GET /api/devices/:deviceId/daily-consumption` — dnevna potrošnja

**Ostalo:** `GET /api/health`

## Struktura

```
src/
├── app.js / server.js       # Express setup + entry point
├── config/                  # DB konekcija, env config
├── controllers/             # Route handleri
├── services/                # Poslovna logika (auth, devices, shelly, measurements, scheduler)
├── routes/                  # Definicije ruta
└── middleware/              # JWT auth, error handling
```

## Automatsko prikupljanje

Konfiguriraj u `.env`:
```env
ENABLE_AUTO_COLLECTION=true
DATA_COLLECTION_SCHEDULE=*/5 * * * *
```

Podržani schedule formati: `*/1 * * * *` (svake min), `0 * * * *` (svaki sat), `0 */4 * * *` (svaka 4h), itd.

## Testovi

```bash
npm test              # pokreni testove
npm run test:watch    # watch mode
npm run test:coverage # s coverage-om
```

## Troubleshooting

Ako MySQL ne radi:
```bash
mysql -u root -p -e "SELECT 1"
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS ecometrix"
```

Ako Shelly uređaj ne reagira:
```bash
curl http://192.168.1.100/rpc/Shelly.GetStatus
ping 192.168.1.100
```

Više o Shelly troubleshootingu: [SHELLY_INTEGRATION.md](./SHELLY_INTEGRATION.md#troubleshooting)

## Licenca

ISC
