# Shelly Plug S Gen3 - Integracija

Kompletan vodič za integraciju Shelly Plug S Gen3 pametnih utičnica u EcoMetrix sustav.

## Sadržaj
1. [Pregled](#pregled)
2. [Postavka uređaja](#postavka-uređaja)
3. [Konfiguracija baze](#konfiguracija-baze)
4. [API Endpoint-i](#api-endpoint-i)
5. [Automatsko prikupljanje](#automatsko-prikupljanje)
6. [Testiranje](#testiranje)

---

## Pregled

EcoMetrix koristi Shelly Plug S Gen3 pametne utičnice za automatsko mjerenje potrošnje električne energije. Integracija se sastoji od:

- **Shelly Service** - komunikacija sa uređajima preko HTTP API-ja
- **Measurements Service** - spremanje i analiza podataka
- **Scheduler Service** - automatsko prikupljanje podataka
- **REST API** - upravljanje uređajima i mjerenjima

### Arhitektura

```
Shelly Plug S Gen3 (192.168.x.x)
         ↓ HTTP/RPC API
    Shelly Service
         ↓
  Measurements Service
         ↓
    MySQL Database
         ↓
     REST API
         ↓
   Frontend / Client
```

---

## Postavka uređaja

### 1. Povezivanje Shelly utičnice na WiFi mrežu

1. Uključite Shelly Plug S Gen3 u utičnicu
2. Spojite se na WiFi access point: `ShellyPlugSG3-XXXXXX`
3. Otvorite browser na `http://192.168.33.1`
4. Konfigurišite WiFi postavke:
   - Odaberite vašu WiFi mrežu
   - Unesite lozinku
   - Spremite postavke

### 2. Pronalaženje IP adrese

Nakon što se uređaj spoji na vašu mrežu:

**Metoda 1 - Shelly Cloud App:**
- Instalirajte Shelly Smart Control aplikaciju
- Pronađite uređaj i zapišite IP adresu

**Metoda 2 - Router:**
- Prijavite se na svoj router
- Provjerite listu spojenih uređaja
- Pronađite "ShellyPlugSG3-XXXXXX"

**Metoda 3 - nmap scan:**
```bash
nmap -sn 192.168.1.0/24
```

### 3. Testiranje komunikacije

Provjerite da li uređaj radi:

```bash
curl http://192.168.1.100/rpc/Shelly.GetStatus
```

Trebali biste dobiti JSON odgovor sa statusom uređaja.

---

## Konfiguracija baze

### 1. Izvršite SQL migraciju za dodavanje IP adrese

```bash
cd backend
mysql -u root -p ecometrix < db_migration_add_ip.sql
```

Ili ručno izvršite SQL:

```sql
ALTER TABLE `pametni_utikac`
ADD COLUMN `ip_adresa` VARCHAR(45) NULL COMMENT 'IP adresa uređaja u lokalnoj mreži' AFTER `status`;

ALTER TABLE `pametni_utikac`
ADD INDEX `idx_ip_adresa` (`ip_adresa`);
```

### 2. Instalirajte dependencies

```bash
cd backend
npm install
```

Novi paket: `node-cron` - za automatsko prikupljanje podataka

### 3. Konfigurirajte .env

```env
# Automatsko prikupljanje podataka
ENABLE_AUTO_COLLECTION=true

# Cron schedule (*/5 * * * * = svakih 5 minuta)
DATA_COLLECTION_SCHEDULE=*/5 * * * *
```

**Primjeri cron schedule:**
- `*/1 * * * *` - Svake minute
- `*/5 * * * *` - Svakih 5 minuta
- `*/15 * * * *` - Svakih 15 minuta
- `0 * * * *` - Svaki sat
- `0 */4 * * *` - Svaka 4 sata

---

## API Endpoint-i

### Autentifikacija

Svi endpoint-i zahtijevaju JWT token u Authorization header-u:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Uređaji

#### Kreiranje uređaja

**POST** `/api/households/:id/devices`

```json
{
  "prostorija_id": 1,
  "naziv": "Hladnjak",
  "tip_uredjaja": "hladnjak",
  "proizvodjac": "Samsung",
  "model": "RB34T632",
  "nominalna_snaga": 150
}
```

#### Pridruživanje Shelly utičnice uređaju

**POST** `/api/devices/:deviceId/plug`

```json
{
  "serijski_broj": "ShellyPlugSG3-123456",
  "proizvodjac": "Shelly",
  "model": "Plug S Gen3",
  "ip_adresa": "192.168.1.100"
}
```

#### Ažuriranje IP adrese utičnice

**PUT** `/api/devices/:deviceId/plug`

```json
{
  "ip_adresa": "192.168.1.101"
}
```

### Mjerenja

#### Dohvaćanje mjerenja za kućanstvo

**GET** `/api/households/:id/measurements?datum_od=2025-01-01&datum_do=2025-01-31`

#### Dohvaćanje mjerenja za uređaj

**GET** `/api/devices/:deviceId/measurements?limit=100`

#### Prikupljanje podataka sa jednog uređaja (ručno)

**POST** `/api/devices/:deviceId/collect`

Odgovor:
```json
{
  "id": 123,
  "uredjaj_id": 1,
  "utikac_id": 1,
  "vrijednost_kwh": 45.234,
  "datum_vrijeme": "2025-01-15T10:30:00.000Z",
  "tip_mjerenja": "automatsko",
  "validno": true,
  "uredjaj_naziv": "Hladnjak",
  "trenutna_snaga": 120.5,
  "napon": 230.2,
  "struja": 0.524,
  "frekvencija": 50.0,
  "ukljucen": true,
  "temperatura": 35.4
}
```

#### Prikupljanje podataka sa svih uređaja u kućanstvu

**POST** `/api/households/:id/collect-all`

Odgovor:
```json
{
  "success": [
    {
      "id": 123,
      "uredjaj_naziv": "Hladnjak",
      "vrijednost_kwh": 45.234
    }
  ],
  "errors": [
    {
      "uredjaj_id": 2,
      "error": "Timeout: Uređaj na 192.168.1.101 ne odgovara."
    }
  ],
  "total": 3,
  "collected": 2,
  "failed": 1
}
```

#### Dnevna potrošnja

**GET** `/api/devices/:deviceId/daily-consumption?datum=2025-01-15`

Odgovor:
```json
{
  "pocetna_vrijednost": 40.123,
  "krajnja_vrijednost": 45.234,
  "potrosnja": 5.111,
  "broj_mjerenja": 288
}
```

#### Statistika potrošnje za kućanstvo

**GET** `/api/households/:id/stats?datum_od=2025-01-01&datum_do=2025-01-31`

Odgovor:
```json
[
  {
    "tip_uredjaja": "hladnjak",
    "uredjaj_naziv": "Hladnjak",
    "broj_mjerenja": 8928,
    "min_vrijednost": 40.123,
    "max_vrijednost": 135.456,
    "ukupna_potrosnja": 95.333,
    "prosjecna_vrijednost": 87.789
  }
]
```

---

## Automatsko prikupljanje

### Kako radi

Kada server starta:
1. Čita `ENABLE_AUTO_COLLECTION` iz .env
2. Ako je `true`, pokreće cron job sa `DATA_COLLECTION_SCHEDULE`
3. Periodično:
   - Dohvaća sve aktivne uređaje sa IP adresom
   - Za svaki uređaj poziva Shelly API
   - Sprema mjerenja u bazu
   - Logira uspjeh/greške

### Logovi

```
[2025-01-15T10:30:00.000Z] Započinjem prikupljanje podataka...
Pronađeno 3 aktivnih uređaja.
✓ Hladnjak (Moje kućanstvo): 45.234 kWh
✓ Perilica (Moje kućanstvo): 12.456 kWh
✗ Bojler (Moje kućanstvo): Timeout: Uređaj na 192.168.1.103 ne odgovara.
  → Utičnica označena kao neaktivna.
[2025-01-15T10:30:05.000Z] Prikupljanje završeno: 2 uspješno, 1 greške.
```

### Ručno pokretanje/zaustavljanje

Možete kontrolisati scheduler programski:

```javascript
import * as scheduler from './services/scheduler.service.js';

// Ručno pokretanje prikupljanja (jednokratno)
await scheduler.triggerManualCollection();

// Zaustavi automatsko prikupljanje
scheduler.stopDataCollection();

// Pokreni sa custom schedule
scheduler.startDataCollection('*/10 * * * *'); // Svakih 10 minuta

// Provjeri status
const isRunning = scheduler.isRunning();
```

---

## Testiranje

### 1. Provjera da server radi

```bash
cd backend
npm run dev
```

Trebali biste vidjeti:
```
🚀 Server running on http://localhost:4000
📊 Automatsko prikupljanje podataka pokrenuto
```

### 2. Test health endpoint

```bash
curl http://localhost:4000/api/health
```

### 3. Registracija i login

**Registracija:**
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "ime": "Test",
    "prezime": "Korisnik",
    "email": "test@test.com",
    "lozinka": "test123",
    "ponovi_lozinku": "test123"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "lozinka": "test123"
  }'
```

Zapamtite `token` iz odgovora!

### 4. Kreiranje kućanstva

```bash
curl -X POST http://localhost:4000/api/households \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "naziv": "Test kućanstvo",
    "adresa": "Test ulica 1",
    "broj_clanova": 2
  }'
```

### 5. Kreiranje prostorije

```bash
curl -X POST http://localhost:4000/api/households/1/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "naziv": "Kuhinja",
    "tip": "kuhinja"
  }'
```

### 6. Kreiranje uređaja

```bash
curl -X POST http://localhost:4000/api/households/1/devices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "prostorija_id": 1,
    "naziv": "Hladnjak",
    "tip_uredjaja": "hladnjak",
    "proizvodjac": "Samsung",
    "nominalna_snaga": 150
  }'
```

### 7. Pridruživanje Shelly utičnice

**VAŽNO:** Zamijenite `192.168.1.100` sa stvarnom IP adresom vaše Shelly utičnice!

```bash
curl -X POST http://localhost:4000/api/devices/1/plug \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "serijski_broj": "ShellyPlugSG3-123456",
    "proizvodjac": "Shelly",
    "model": "Plug S Gen3",
    "ip_adresa": "192.168.1.100"
  }'
```

### 8. Test prikupljanja podataka

**Ručno prikupljanje:**
```bash
curl -X POST http://localhost:4000/api/devices/1/collect \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Prikupljanje svih uređaja:**
```bash
curl -X POST http://localhost:4000/api/households/1/collect-all \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 9. Provjera mjerenja

```bash
curl http://localhost:4000/api/devices/1/measurements?limit=10 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 10. Testiranje sa stvarnim Shelly uređajem

1. Pronađite IP adresu vašeg Shelly Plug S Gen3 uređaja
2. Testirajte direktno:

```bash
curl http://192.168.1.100/rpc/Shelly.GetStatus
```

3. Provjerite da dobivate odgovor sa `pm1:0` objektom
4. Koristite tu IP adresu u koracima iznad

---

## Troubleshooting

### Problem: "Timeout: Uređaj ne odgovara"

**Rješenje:**
- Provjerite da je Shelly uređaj uključen
- Provjerite IP adresu (`ping 192.168.1.100`)
- Provjerite da su server i Shelly na istoj mreži
- Provjerite firewall postavke

### Problem: "Uređaj nema pridruženu aktivnu pametnu utičnicu"

**Rješenje:**
- Prvo kreirajte uređaj
- Zatim pridružite Shelly utičnicu sa IP adresom
- Provjerite status: `SELECT * FROM pametni_utikac WHERE uredjaj_id = 1;`

### Problem: Automatsko prikupljanje ne radi

**Rješenje:**
- Provjerite `.env`: `ENABLE_AUTO_COLLECTION=true`
- Provjerite logove servera
- Provjerite da utičnica ima konfiguriranu IP adresu
- Ručno pokrenite: `POST /api/devices/1/collect`

### Problem: "Pametna utičnica s ovim serijskim brojem već postoji"

**Rješenje:**
- Svaka utičnica mora imati unikatan serijski broj
- Koristite stvarni serijski broj sa uređaja
- Ili ga možete pročitati iz Shelly API-ja

---

## API Dokumentacija

Za potpunu dokumentaciju svih endpoint-a, pogledajte:
- `src/routes/devices.routes.js`
- `src/routes/measurements.routes.js`
- `src/controllers/devices.controller.js`
- `src/controllers/measurements.controller.js`

---

## Reference

- [Shelly Plug S Gen3 API Dokumentacija](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen3/ShellyPlugSG3/)
- [Shelly RPC Protocol](https://shelly-api-docs.shelly.cloud/)
- [PM1 Component](https://shelly-api-docs.shelly.cloud/gen2/ComponentsAndServices/PM1/)
