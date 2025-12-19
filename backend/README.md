# EcoMetrix Backend

REST API server za EcoMetrix - sustav za praćenje i optimizaciju potrošnje energije u kućanstvu.

Izgrađen sa Express.js, MySQL bazom podataka i JWT autentifikacijom. Uključuje integraciju sa **Shelly Plug S Gen3** pametnim utičnicama za automatsko prikupljanje podataka o potrošnji energije.

## Ključne funkcionalnosti

- ✅ JWT autentifikacija (registracija, login)
- ✅ CRUD operacije za korisnike, kućanstva, prostorije i uređaje
- ✅ **Shelly Plug S Gen3 integracija** (RPC API)
- ✅ Automatsko prikupljanje podataka o potrošnji energije
- ✅ Spremanje i analiza mjerenja
- ✅ Statistika i izvještaji o potrošnji
- ✅ Scheduler za periodično prikupljanje (node-cron)

## Preduvjeti

- Node.js 18+ i npm
- MySQL 8.0+ baza podataka
- Shelly Plug S Gen3 pametne utičnice (opcionalno, za automatsko mjerenje)

## Instalacija i konfiguracija

### 1. Instalirajte dependencies

```bash
npm install
```

### 2. Konfigurirajte environment

```bash
cp .env.example .env
```

Uredite `.env` file:

```env
PORT=4000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=vasa_lozinka
DB_NAME=ecometrix
JWT_SECRET=vasa_tajna_lozinka
JWT_EXPIRES_IN=1d

# Automatsko prikupljanje podataka
ENABLE_AUTO_COLLECTION=true
DATA_COLLECTION_SCHEDULE=*/5 * * * *
```

### 3. Kreirajte bazu podataka

```bash
mysql -u root -p < ../ecometrix_schema.sql
mysql -u root -p ecometrix < db_migration_add_ip.sql
```

## Pokretanje servera

**Development sa automatskim reload-om:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server bi trebao ispisati:
```
🚀 Server running on http://localhost:4000
📊 Automatsko prikupljanje podataka pokrenuto
```

## Shelly Plug S Gen3 Integracija

Za detaljne upute o postavljanju i korištenju Shelly pametnih utičnica, pogledajte:

📖 **[SHELLY_INTEGRATION.md](./SHELLY_INTEGRATION.md)**

### Brzi start

1. Povežite Shelly utičnicu na WiFi mrežu
2. Pronađite njenu IP adresu (npr. 192.168.1.100)
3. Kreirajte uređaj preko API-ja
4. Pridružite Shelly utičnicu uređaju sa IP adresom
5. Automatsko prikupljanje će početi raditi!

Primjer:
```bash
# Pridruži Shelly utičnicu uređaju
curl -X POST http://localhost:4000/api/devices/1/plug \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "serijski_broj": "ShellyPlugSG3-123456",
    "ip_adresa": "192.168.1.100",
    "proizvodjac": "Shelly",
    "model": "Plug S Gen3"
  }'

# Prikupi podatke sa uređaja
curl -X POST http://localhost:4000/api/devices/1/collect \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## API Endpoint-i

### Autentifikacija
- `POST /api/auth/register` - Registracija korisnika
- `POST /api/auth/login` - Prijava korisnika
- `GET /api/auth/me` - Dohvat trenutnog korisnika

### Kućanstva
- `GET /api/households` - Lista kućanstava
- `POST /api/households` - Kreiranje kućanstva
- `GET /api/households/:id` - Pojedinačno kućanstvo
- `GET /api/households/:id/rooms` - Prostorije u kućanstvu
- `POST /api/households/:id/rooms` - Kreiranje prostorije

### Uređaji
- `GET /api/households/:id/devices` - Lista uređaja za kućanstvo
- `POST /api/households/:id/devices` - Kreiranje uređaja
- `GET /api/devices/:deviceId` - Pojedinačni uređaj
- `GET /api/devices/:deviceId/plug` - Pametna utičnica za uređaj
- `POST /api/devices/:deviceId/plug` - Pridruživanje pametne utičnice
- `PUT /api/devices/:deviceId/plug` - Ažuriranje pametne utičnice

### Mjerenja
- `GET /api/households/:id/measurements` - Sva mjerenja za kućanstvo
- `GET /api/households/:id/stats` - Statistika potrošnje
- `POST /api/households/:id/collect-all` - Prikupljanje sa svih uređaja
- `GET /api/devices/:deviceId/measurements` - Mjerenja za uređaj
- `POST /api/devices/:deviceId/collect` - Prikupljanje sa uređaja
- `GET /api/devices/:deviceId/daily-consumption` - Dnevna potrošnja
- `POST /api/devices/:deviceId/measurements` - Ručno dodavanje mjerenja

### Health Check
- `GET /api/health` - Status servera

## Testiranje API-ja

```bash
# Health check
curl http://localhost:4000/api/health

# Registracija
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "ime": "Test",
    "prezime": "Korisnik",
    "email": "test@test.com",
    "lozinka": "test123",
    "ponovi_lozinku": "test123"
  }'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "lozinka": "test123"
  }'
```

## Struktura projekta

```
backend/
├── src/
│   ├── app.js                          # Express app setup
│   ├── server.js                       # Server entry point
│   ├── config/
│   │   ├── db.js                       # MySQL connection
│   │   └── env.js                      # Environment config
│   ├── controllers/
│   │   ├── auth.controller.js          # Auth endpoints
│   │   ├── households.controller.js    # Kućanstva endpoints
│   │   ├── devices.controller.js       # Uređaji endpoints
│   │   └── measurements.controller.js  # Mjerenja endpoints
│   ├── services/
│   │   ├── auth.service.js             # Auth business logic
│   │   ├── households.service.js       # Kućanstva logic
│   │   ├── devices.service.js          # Uređaji logic
│   │   ├── shelly.service.js           # 🆕 Shelly API integration
│   │   ├── measurements.service.js     # 🆕 Mjerenja logic
│   │   └── scheduler.service.js        # 🆕 Auto data collection
│   ├── routes/
│   │   ├── auth.routes.js              # Auth routes
│   │   ├── households.routes.js        # Kućanstva routes
│   │   ├── devices.routes.js           # 🆕 Uređaji routes
│   │   └── measurements.routes.js      # 🆕 Mjerenja routes
│   └── middleware/
│       ├── auth.middleware.js          # JWT verification
│       └── error.middleware.js         # Error handling
├── db_migration_add_ip.sql             # 🆕 SQL migration
├── SHELLY_INTEGRATION.md               # 🆕 Detaljni vodič
├── package.json
├── .env.example
└── README.md
```

## Automatsko prikupljanje podataka

Server automatski prikuplja podatke sa svih aktivnih Shelly uređaja prema definiranom rasporedu (default: svakih 5 minuta).

**Konfiguracija:**
```env
ENABLE_AUTO_COLLECTION=true
DATA_COLLECTION_SCHEDULE=*/5 * * * *
```

**Cron schedule primjeri:**
- `*/1 * * * *` - Svake minute
- `*/5 * * * *` - Svakih 5 minuta
- `0 * * * *` - Svaki sat
- `0 */4 * * *` - Svaka 4 sata

**Logovi:**
```
[2025-01-15T10:30:00.000Z] Započinjem prikupljanje podataka...
Pronađeno 3 aktivnih uređaja.
✓ Hladnjak (Moje kućanstvo): 45.234 kWh
✓ Perilica (Moje kućanstvo): 12.456 kWh
[2025-01-15T10:30:05.000Z] Prikupljanje završeno: 2 uspješno, 0 greške.
```

## Tehnologije

- **Express.js 5** - Web framework
- **MySQL 2** - Database driver
- **bcrypt** - Password hashing
- **jsonwebtoken** - JWT authentication
- **node-cron** - Task scheduler
- **dotenv** - Environment management
- **cors** - CORS support

## Troubleshooting

### Problem sa bazom podataka
```bash
# Provjeri da li MySQL radi
mysql -u root -p -e "SELECT 1"

# Kreiraj bazu ako ne postoji
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS ecometrix"
```

### Problem sa Shelly uređajem
```bash
# Test direktne komunikacije
curl http://192.168.1.100/rpc/Shelly.GetStatus

# Provjeri ping
ping 192.168.1.100
```

Detaljnije rješavanje problema: **[SHELLY_INTEGRATION.md](./SHELLY_INTEGRATION.md#troubleshooting)**

## Sljedeći koraci

- [ ] Razviti React frontend
- [ ] Implementirati algoritme za analizu obrazaca
- [ ] Dodati sustav preporuka za uštedu energije
- [ ] Kreirati dashboard sa vizualizacijama
- [ ] Dodati podršku za tarife (VT/NT)
- [ ] Implementirati izvještaje (PDF, Excel)

## Licenca

ISC
