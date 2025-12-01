import * as svc from '../services/households.service.js';
const DOZVOLJENI_TIPOVI_PROSTORIJE = [
  'dnevna_soba',
  'kuhinja',
  'spavaca_soba',
  'kupaonica',
  'hodnik',
  'ostalo'
];
export async function listHouseholds(req, res, next) {
    try {
        const korisnikId = req.user.id;
        const data = await svc.listHouseholds(korisnikId);
        res.json(data);
    } catch (error) {
        next(error);
    }
}

export async function createHousehold(req, res, next) {
    try {
        const korisnikId = req.user.id;
        const { naziv, adresa, broj_clanova, kvadratura } = req.body;
        
        if(!naziv || !adresa){
            return res.status(400).json({message:'Naziv i adresa su obavezni.'});
        }
    const created =  await svc.createHousehold(korisnikId,{
        naziv,
        adresa,
        broj_clanova:broj_clanova ?? 1,
        kvadratura:kvadratura ?? null
    });

        res.status(201).json(created);
    } catch (error) {
        next(error);
    }
}

export async function getHousehold(req, res, next) {
    try {
        const korisnikId = req.user.id;
        const id= Number(req.params.id);
        const data = await svc.getHouseholdById(korisnikId, id);
        res.json(data);
    } catch (error) {
        next(error);
    }
}

export async function listRooms(req, res, next) {
    try {
        const korisnikId = req.user.id;
        const kucanstvoId = Number(req.params.id);
        const data = await svc.listRooms(korisnikId, kucanstvoId);
        res.json(data);
    } catch (error) {
        next(error);
    }   
}
export async function createRoom(req, res, next) {
 try {
    const korisnikId = req.user.id;
    const kucanstvoId = Number(req.params.id);
    const { naziv, tip, kvadratura } = req.body;

    if (!naziv) {
      return res.status(400).json({ message: 'naziv je obavezan.' });
    }

    let tipValue = tip ?? 'ostalo';

    if (!DOZVOLJENI_TIPOVI_PROSTORIJE.includes(tipValue)) {
      return res.status(400).json({
        message: 'Neispravan tip prostorije.',
        dozvoljeni_tipovi: DOZVOLJENI_TIPOVI_PROSTORIJE
      });
    }

    const created = await svc.createRoom(korisnikId, kucanstvoId, {
      naziv,
      tip: tipValue,
      kvadratura: kvadratura ?? null
    });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}
