import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDb } from '../config/db.js';
import { config } from '../config/env.js';

const SALT_ROUNDS = 10;

// Registracija - kreira novi korisnicki racun
export async function registerUser({ ime, prezime, email, lozinka }) {
  const db = getDb();

  // Provjeri da li email vec postoji
  const [rows] = await db.query(
    'SELECT korisnik_id FROM korisnik WHERE email = ?',
    [email]
  );

  if (rows.length > 0) {
    const err = new Error('Email adresa se vec koristi');
    err.status = 400;
    throw err;
  }

  // Hashiraj lozinku
  const hash = await bcrypt.hash(lozinka, SALT_ROUNDS);

  const [result] = await db.query(
    `INSERT INTO korisnik (ime, prezime, email, lozinka, datum_registracije, aktivan)
     VALUES (?, ?, ?, ?, NOW(), 1)`,
    [ime, prezime, email, hash]
  );

  const korisnikId = result.insertId;

  // Generiraj token za auto-login nakon registracije
  const token = jwt.sign(
    { id: korisnikId, email: email },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  return {
    token,
    user: {
      id: korisnikId,
      ime,
      prezime,
      email
    }
  };
}

// Login korisnika
export async function loginUser({ email, lozinka }) {
  const db = getDb();

  const [rows] = await db.query(
    `SELECT korisnik_id, ime, prezime, email, lozinka, aktivan
     FROM korisnik
     WHERE email = ?`,
    [email]
  );

  if (rows.length === 0) {
    const err = new Error('Email ili lozinka nisu tocni');
    err.status = 401;
    throw err;
  }

  const user = rows[0];

  // Provjeri da li je racun aktivan
  if (!user.aktivan) {
    const err = new Error('Racun je deaktiviran');
    err.status = 403;
    throw err;
  }

  // Provjeri lozinku
  const passwordMatch = await bcrypt.compare(lozinka, user.lozinka);
  if (!passwordMatch) {
    const err = new Error('Email ili lozinka nisu tocni');
    err.status = 401;
    throw err;
  }

  // Sve ok, generiraj token
  const token = jwt.sign(
    { id: user.korisnik_id, email: user.email },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  return {
    token,
    user: {
      id: user.korisnik_id,
      ime: user.ime,
      prezime: user.prezime,
      email: user.email
    }
  };
}

// Dohvati korisnika po ID-u
export async function getUserById(id) {
  const db = getDb();

  const [rows] = await db.query(
    `SELECT korisnik_id, ime, prezime, email, datum_registracije
     FROM korisnik
     WHERE korisnik_id = ?`,
    [id]
  );

  if (rows.length === 0) {
    const err = new Error('Korisnik ne postoji');
    err.status = 404;
    throw err;
  }

  const user = rows[0];

  return {
    id: user.korisnik_id,
    ime: user.ime,
    prezime: user.prezime,
    email: user.email,
    datum_registracije: user.datum_registracije
  };
}
