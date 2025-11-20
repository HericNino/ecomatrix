# Ecometrix Backend

API server built with Express, MySQL and JWT auth. Follow the steps below to get a working local setup and test the health endpoint.

## Prerequisites
- Node.js 18+ and npm
- Running MySQL instance with a database you can access

## Install & Configure
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the sample environment file and fill in your secrets:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and update the database credentials and JWT settings if needed.

`.env.example` contains the following defaults:
```env
PORT=4000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=rootroot
DB_NAME=ecometrix
JWT_SECRET=neka_tajna_lozinka
JWT_EXPIRES_IN=1d
```

## Run the Server
- Development with automatic reloads:
  ```bash
  npm run dev
  ```
- Production-style run:
  ```bash
  npm start
  ```

Once the server prints `Server running on http://localhost:4000` it is ready.

## Test an API Route
Call the built-in health-check endpoint to confirm everything works. You can use curl or Postman.

```bash
curl -i http://localhost:4000/api/health
```
The response should be HTTP 200 with `{"status":"ok"}`. Use the same URL in Postman to verify via GUI.
