# EcoMetrix Frontend

React aplikacija za EcoMetrix — prati i vizualizira potrošnju energije po kućanstvima, uređajima i prostorijama.

## Tech stack

React 19 · Vite · React Router v7 · Axios · Recharts · react-hot-toast · react-icons · date-fns · jsPDF

## Preduvjeti

- Node.js 18+
- Backend pokrenut na `http://localhost:4000`

## Setup

```bash
npm install
npm run dev
```

Otvori `http://localhost:5173/`

Za production build:
```bash
npm run build
npm run preview
```

## Struktura

```
src/
├── pages/           # Login, Register, Dashboard, Households, Devices, Reports, Settings
├── components/      # DashboardLayout, ProtectedRoute, ostale reusable komponente
├── services/        # API pozivi (auth, households, devices) — koriste centralnu Axios instancu
├── context/         # AuthContext za JWT auth state
├── hooks/           # Custom React hookovi
├── utils/           # Helperi
├── App.jsx          # Routing
└── main.jsx         # Entry point
```

## Kako radi

Frontend komunicira s backendom na `http://localhost:4000/api`. JWT token se automatski šalje u svakom requestu kroz Axios interceptor.

Stranice su protected — neprijavljeni korisnici se redirectaju na login.

## Razvoj

**Nova stranica:** kreiraj komponentu u `src/pages/`, dodaj rutu u `App.jsx`, dodaj link u `DashboardLayout.jsx`.

**Novi API servis:** kreiraj u `src/services/`, koristi `api.js` instancu koja već handla auth token.

**Stilovi:** globalni u `src/index.css`, component-specifični `.css` fileovi pokraj komponenti.

## Troubleshooting

- **CORS greške** — provjeri da backend ima CORS za `http://localhost:5173`
- **API ne radi** — backend mora biti pokrenut, provjeri network tab
- **Token error** — odjavi se pa se prijavi ponovo

## Licenca

ISC
