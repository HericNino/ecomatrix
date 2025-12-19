# EcoMetrix - Testiranje sa Shelly utičnicama

## Vaše Shelly Plug S utičnice

| Tip | IP Adresa | Opis |
|-----|-----------|------|
| Niska potrošnja | 192.168.1.166 | Uređaji niske potrošnje (lampice, punjači, itd.) |
| Srednja potrošnja | 192.168.1.71 | Uređaji srednje potrošnje (TV, laptop, itd.) |
| Visoka potrošnja | 192.168.1.244 | Uređaji visoke potrošnje (bojler, perilica, itd.) |

---

## KORAK 1: Testiranje komunikacije sa utičnicama

Otvorite terminal i testirajte svaku utičnicu:

```bash
# Utičnica 1 - Niska potrošnja
curl http://192.168.1.166/rpc/Shelly.GetStatus

# Utičnica 2 - Srednja potrošnja
curl http://192.168.1.71/rpc/Shelly.GetStatus

# Utičnica 3 - Visoka potrošnja
curl http://192.168.1.244/rpc/Shelly.GetStatus
```

Ako sve radi, trebali biste dobiti JSON odgovor sa podacima o uređaju!

---

## KORAK 2: Pokretanje backend servera

```bash
cd backend

# Instalirajte dependencies (ako još niste)
npm install

# Izvršite SQL migraciju za IP adresu
mysql -u root -p ecometrix < db_migration_add_ip.sql

# Kreirajte .env file ako ne postoji
cp .env.example .env

# Uredite .env sa vašim MySQL postavkama
# Provjerite da su ove linije postavljene:
# ENABLE_AUTO_COLLECTION=true
# DATA_COLLECTION_SCHEDULE=*/5 * * * *

# Pokrenite server
npm run dev
```

Server bi trebao ispisati:
```
🚀 Server running on http://localhost:4000
📊 Automatsko prikupljanje podataka pokrenuto
```

---

## KORAK 3: Registracija i login

### 3.1 Registracija novog korisnika

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "ime": "Nino",
    "prezime": "Herić",
    "email": "nino@ecometrix.com",
    "lozinka": "test123",
    "ponovi_lozinku": "test123"
  }'
```

### 3.2 Login

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nino@ecometrix.com",
    "lozinka": "test123"
  }'
```

**VAŽNO:** Zapamtite `token` iz odgovora! Koristit ćete ga u svim sljedećim zahtjevima.

Postavite ga kao varijablu:
```bash
# Linux/Mac
export TOKEN="vaš_jwt_token_ovdje"

# Windows CMD
set TOKEN=vaš_jwt_token_ovdje

# Windows PowerShell
$env:TOKEN="vaš_jwt_token_ovdje"
```

---

## KORAK 4: Kreiranje kućanstva

```bash
curl -X POST http://localhost:4000/api/households \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "naziv": "Moje kućanstvo",
    "adresa": "Testna ulica 1, Zagreb",
    "broj_clanova": 1,
    "kvadratura": 80
  }'
```

Zapamtite `kucanstvo_id` (npr. 1)!

---

## KORAK 5: Kreiranje prostorija

```bash
# Dnevna soba
curl -X POST http://localhost:4000/api/households/1/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "naziv": "Dnevna soba",
    "tip": "dnevna_soba",
    "kvadratura": 25
  }'

# Kuhinja
curl -X POST http://localhost:4000/api/households/1/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "naziv": "Kuhinja",
    "tip": "kuhinja",
    "kvadratura": 15
  }'

# Kupaonica
curl -X POST http://localhost:4000/api/households/1/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "naziv": "Kupaonica",
    "tip": "kupaonica",
    "kvadratura": 8
  }'
```

---

## KORAK 6: Kreiranje uređaja i pridruživanje utičnica

### 6.1 Uređaj 1 - Niska potrošnja (npr. LED TV)

```bash
# Kreiraj uređaj
curl -X POST http://localhost:4000/api/households/1/devices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "prostorija_id": 1,
    "naziv": "LED TV",
    "tip_uredjaja": "tv",
    "proizvodjac": "Samsung",
    "nominalna_snaga": 65
  }'

# Pridruži Shelly utičnicu (IP: 192.168.1.166)
curl -X POST http://localhost:4000/api/devices/1/plug \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "serijski_broj": "ShellyPlugS-Low",
    "proizvodjac": "Shelly",
    "model": "Plug S Gen3",
    "ip_adresa": "192.168.1.166"
  }'
```

### 6.2 Uređaj 2 - Srednja potrošnja (npr. Laptop)

```bash
# Kreiraj uređaj
curl -X POST http://localhost:4000/api/households/1/devices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "prostorija_id": 1,
    "naziv": "Laptop",
    "tip_uredjaja": "racunalo",
    "proizvodjac": "Dell",
    "nominalna_snaga": 120
  }'

# Pridruži Shelly utičnicu (IP: 192.168.1.71)
curl -X POST http://localhost:4000/api/devices/2/plug \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "serijski_broj": "ShellyPlugS-Medium",
    "proizvodjac": "Shelly",
    "model": "Plug S Gen3",
    "ip_adresa": "192.168.1.71"
  }'
```

### 6.3 Uređaj 3 - Visoka potrošnja (npr. Bojler)

```bash
# Kreiraj uređaj
curl -X POST http://localhost:4000/api/households/1/devices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "prostorija_id": 3,
    "naziv": "Bojler",
    "tip_uredjaja": "bojler",
    "proizvodjac": "Gorenje",
    "nominalna_snaga": 2000
  }'

# Pridruži Shelly utičnicu (IP: 192.168.1.244)
curl -X POST http://localhost:4000/api/devices/3/plug \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "serijski_broj": "ShellyPlugS-High",
    "proizvodjac": "Shelly",
    "model": "Plug S Gen3",
    "ip_adresa": "192.168.1.244"
  }'
```

---

## KORAK 7: Testiranje prikupljanja podataka

### 7.1 Prikupljanje podataka sa pojedinačnog uređaja

```bash
# LED TV (niska potrošnja)
curl -X POST http://localhost:4000/api/devices/1/collect \
  -H "Authorization: Bearer $TOKEN"

# Laptop (srednja potrošnja)
curl -X POST http://localhost:4000/api/devices/2/collect \
  -H "Authorization: Bearer $TOKEN"

# Bojler (visoka potrošnja)
curl -X POST http://localhost:4000/api/devices/3/collect \
  -H "Authorization: Bearer $TOKEN"
```

### 7.2 Prikupljanje sa svih uređaja odjednom

```bash
curl -X POST http://localhost:4000/api/households/1/collect-all \
  -H "Authorization: Bearer $TOKEN"
```

Odgovor će pokazati koliko je uređaja uspješno prikupljeno:
```json
{
  "success": [
    { "id": 1, "uredjaj_naziv": "LED TV", "vrijednost_kwh": 0.456 },
    { "id": 2, "uredjaj_naziv": "Laptop", "vrijednost_kwh": 1.234 },
    { "id": 3, "uredjaj_naziv": "Bojler", "vrijednost_kwh": 15.678 }
  ],
  "errors": [],
  "total": 3,
  "collected": 3,
  "failed": 0
}
```

---

## KORAK 8: Pregled mjerenja

### 8.1 Dohvaćanje mjerenja za uređaj

```bash
# Zadnjih 10 mjerenja za LED TV
curl http://localhost:4000/api/devices/1/measurements?limit=10 \
  -H "Authorization: Bearer $TOKEN"
```

### 8.2 Sva mjerenja za kućanstvo

```bash
curl "http://localhost:4000/api/households/1/measurements?datum_od=2025-01-01&datum_do=2025-12-31" \
  -H "Authorization: Bearer $TOKEN"
```

### 8.3 Dnevna potrošnja

```bash
# Današnja potrošnja za LED TV
curl "http://localhost:4000/api/devices/1/daily-consumption?datum=$(date +%Y-%m-%d)" \
  -H "Authorization: Bearer $TOKEN"
```

### 8.4 Statistika za kućanstvo

```bash
curl "http://localhost:4000/api/households/1/stats?datum_od=2025-01-01&datum_do=2025-12-31" \
  -H "Authorization: Bearer $TOKEN"
```

---

## KORAK 9: Provjera automatskog prikupljanja

Ako ste postavili `ENABLE_AUTO_COLLECTION=true` u `.env`, server će automatski prikupljati podatke svakih 5 minuta.

Provjerite logove servera:
```
[2025-01-15T10:30:00.000Z] Započinjem prikupljanje podataka...
Pronađeno 3 aktivnih uređaja.
✓ LED TV (Moje kućanstvo): 0.456 kWh
✓ Laptop (Moje kućanstvo): 1.234 kWh
✓ Bojler (Moje kućanstvo): 15.678 kWh
[2025-01-15T10:30:05.000Z] Prikupljanje završeno: 3 uspješno, 0 greške.
```

---

## KORAK 10: Upravljanje utičnicama

### 10.1 Uključivanje/isključivanje uređaja

**VAŽNO:** Za ovu funkcionalnost možete dodati endpoint, ali trenutno možete upravljati direktno:

```bash
# Uključi LED TV
curl "http://192.168.1.166/rpc/Switch.Set?id=0&on=true"

# Isključi LED TV
curl "http://192.168.1.166/rpc/Switch.Set?id=0&on=false"

# Uključi Laptop
curl "http://192.168.1.71/rpc/Switch.Set?id=0&on=true"

# Uključi Bojler
curl "http://192.168.1.244/rpc/Switch.Set?id=0&on=true"
```

---

## Troubleshooting

### Problem: "Uređaj ne odgovara"
```bash
# Testirajte ping
ping 192.168.1.166
ping 192.168.1.71
ping 192.168.1.244

# Testirajte direktnu komunikaciju
curl http://192.168.1.166/rpc/Shelly.GetStatus
```

### Problem: JWT token expired
```bash
# Prijavite se ponovno i dobijte novi token
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nino@ecometrix.com",
    "lozinka": "test123"
  }'
```

### Problem: MySQL connection error
```bash
# Provjerite da li MySQL radi
mysql -u root -p -e "SELECT 1"

# Provjerite .env postavke
cat .env
```

---

## Testni scenarij za demonstraciju

1. **Setup (5 min)**
   - Pokrenite server
   - Registrirajte se i prijavite
   - Kreirajte kućanstvo i prostorije

2. **Dodavanje uređaja (5 min)**
   - Kreirajte 3 uređaja
   - Pridružite Shelly utičnice sa IP adresama

3. **Prikupljanje podataka (2 min)**
   - Prikupite podatke sa svih uređaja
   - Provjerite mjerenja

4. **Automatsko prikupljanje (demonstracija)**
   - Pričekajte 5 minuta
   - Provjerite da li se podaci automatski prikupljaju u logovima

5. **Statistika (2 min)**
   - Dohvatite dnevnu potrošnju
   - Dohvatite statistiku za kućanstvo

---

## Sljedeći koraci

Nakon uspješnog testiranja:

1. ✅ Backend integracija - **GOTOVA I TESTIRANA**
2. 📊 Kreirajte React frontend za vizualizaciju podataka
3. 📈 Dodajte grafikone (Chart.js ili Recharts)
4. 🤖 Implementirajte algoritme za analizu
5. 💡 Dodajte sustav preporuka

---

**Bilješke:**
- Zamijenite `kucanstvo_id`, `prostorija_id`, `uredjaj_id` sa stvarnim ID-ovima iz odgovora
- Zamijenite `$TOKEN` sa vašim JWT tokenom
- Prilagodite nazive uređaja prema stvarnim uređajima koje imate spojene na utičnice
