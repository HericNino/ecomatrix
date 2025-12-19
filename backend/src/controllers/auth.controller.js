import { registerUser, loginUser, getUserById } from "../services/auth.service.js";

export async function register(req,res,next) {
    try {
        const { ime, prezime, email, lozinka, ponovi_lozinku } = req.body;

        if(!ime || !prezime || !email || !lozinka || !ponovi_lozinku) {
            return res.status(400).json({message:'Sva polja su obavezna.'});
        }

        if(lozinka !== ponovi_lozinku) {
            return res.status(400).json({message:'Lozinke se ne podudaraju.'});
        }

        const korisnik = await registerUser({ ime, prezime, email, lozinka });

        res.status(201).json(korisnik);
    } catch (error) {
        next(error);
    }
}

export async function login(req,res,next) {
    try {
        const { email, lozinka } = req.body;

        if(!email || !lozinka) {
            return res.status(400).json({message:'Email i lozinka su obavezni.'});
        }

        const result = await loginUser({ email, lozinka });

        res.json(result);
    } catch (error) {
        next(error);
    }
}

export async function me(req,res,next) {
    try {
        const userId = req.user.id;
        const korisnik = await getUserById(userId);
        res.json(korisnik);
    } catch (error) {
        next(error);
    }
}