import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export function authRequired(req, res, next) {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7):null;

    if(!token){
        return res.status(401).json({message: 'Nedostaje token.'});
    }

    try{
        const payload = jwt.verify(token,config.jwt.secret);
        req.user = { id:payload.id, email:payload.email };
        next();
    }catch (err) {
        return res.status(401).json({ message: 'Neispravan ili istekao token.' });
    }
}