import { registerUser, loginUser, getUserById } from "../services/auth.service.js";

// Registracija novog korisnika
export async function register(req, res, next) {
    try {
        const { ime, prezime, email, lozinka, ponovi_lozinku } = req.body;

        // Provjera da su sva polja popunjena
        if (!ime || !prezime || !email || !lozinka || !ponovi_lozinku) {
            return res.status(400).json({ message: 'Molimo ispunite sva polja' });
        }

        if (lozinka !== ponovi_lozinku) {
            return res.status(400).json({ message: 'Lozinke moraju biti iste' });
        }

        const korisnik = await registerUser({ ime, prezime, email, lozinka });
        res.status(201).json(korisnik);
    } catch (error) {
        next(error);
    }
}

// Login
export async function login(req, res, next) {
    try {
        const { email, lozinka } = req.body;

        if (!email || !lozinka) {
            return res.status(400).json({ message: 'Unesite email i lozinku' });
        }

        const result = await loginUser({ email, lozinka });
        res.json(result);
    } catch (error) {
        next(error);
    }
}

// Dohvati trenutnog korisnika
export async function me(req, res, next) {
    try {
        const userId = req.user.id;
        const korisnik = await getUserById(userId);
        res.json({ user: korisnik });
    } catch (error) {
        next(error);
    }
}