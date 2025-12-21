# EcoMetrix Frontend

React frontend aplikacija za EcoMetrix - sustav za praćenje i optimizaciju potrošnje energije u kućanstvu.

Izgrađen sa **React + Vite**, **React Router**, **Axios** i **Recharts**.

## Tehnologije

- **React 18** - UI biblioteka
- **Vite** - Build tool i dev server
- **React Router v6** - Client-side routing
- **Axios** - HTTP client za API pozive
- **Recharts** - Grafikoni i vizualizacija podataka
- **date-fns** - Formatiranje datuma

## Preduvjeti

- Node.js 18+ i npm
- EcoMetrix backend pokrenut na `http://localhost:4000`

## Instalacija

```bash
npm install
```

## Pokretanje

**Development server:**
```bash
npm run dev
```

Aplikacija će biti dostupna na `http://localhost:5173/`

**Production build:**
```bash
npm run build
npm run preview
```

## Struktura projekta

```
frontend/
├── src/
│   ├── components/         # Reusable komponente
│   │   ├── DashboardLayout.jsx
│   │   └── ProtectedRoute.jsx
│   ├── pages/             # Stranice aplikacije
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Households.jsx
│   │   ├── Devices.jsx
│   │   ├── Reports.jsx
│   │   └── Settings.jsx
│   ├── services/          # API servisi
│   │   ├── api.js
│   │   ├── auth.service.js
│   │   ├── households.service.js
│   │   └── devices.service.js
│   ├── context/           # React Context
│   │   └── AuthContext.jsx
│   ├── hooks/             # Custom hooks
│   ├── utils/             # Helper funkcije
│   ├── App.jsx            # Root component s routing-om
│   └── main.jsx           # Entry point
├── package.json
└── vite.config.js
```

## Funkcionalnosti

### Implementirano

- ✅ Autentifikacija (Login/Register)
- ✅ JWT token upravljanje
- ✅ Protected routes
- ✅ Dashboard layout s navigacijom
- ✅ Početni dashboard
- ✅ API integracija s backendom

### U izradi

- 🔄 Upravljanje kućanstvima
- 🔄 Upravljanje uređajima
- 🔄 Grafikoni potrošnje
- 🔄 Izvještaji i statistika
- 🔄 Real-time prikaz podataka
- 🔄 Preporuke za optimizaciju

## API Endpoint-i

Frontend komunicira s backendom preko REST API-ja:
- Base URL: `http://localhost:4000/api`
- Autentifikacija: JWT Bearer token u Authorization headeru

## Razvoj

### Dodavanje nove stranice

1. Kreiraj komponentu u `src/pages/`
2. Dodaj rutu u `src/App.jsx`
3. Dodaj navigacijski link u `src/components/DashboardLayout.jsx`

### Dodavanje novog API servisa

1. Kreiraj servis u `src/services/`
2. Koristi `api.js` instance za HTTP zahtjeve
3. Servisi automatski šalju JWT token ako je korisnik prijavljen

### Stiliziranje

- CSS moduli su podržani
- Globalni stilovi u `src/index.css`
- Component-specifični stilovi kao `.css` fajlovi pokraj komponenti

## Troubleshooting

### CORS greške

Provjeri da backend ima CORS konfiguriran za `http://localhost:5173`

### API pozivi ne rade

1. Provjeri da li backend radi na `http://localhost:4000`
2. Provjeri konzolu preglednika za greške
3. Provjeri network tab u dev tools-u

### Token nije valjan

1. Odjavi se i prijavi ponovno
2. Provjeri da JWT_SECRET na backendu i frontendu odgovara

## Licenca

ISC
