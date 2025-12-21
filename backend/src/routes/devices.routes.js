/**
 * Devices Routes
 *
 * Rute za upravljanje uređajima i pametnim utičnicama
 */

import { Router } from 'express';
import * as ctrl from '../controllers/devices.controller.js';

export const devicesRouter = Router();

// Dohvaćanje svih uređaja za kućanstvo
devicesRouter.get('/households/:id/devices', ctrl.listDevicesForHousehold);

// Kreiranje novog uređaja za kućanstvo
devicesRouter.post('/households/:id/devices', ctrl.createDeviceForHousehold);

// Dohvaćanje pojedinačnog uređaja
devicesRouter.get('/devices/:deviceId', ctrl.getDeviceById);

// Ažuriranje i brisanje uređaja
devicesRouter.put('/devices/:deviceId', ctrl.updateDevice);
devicesRouter.delete('/devices/:deviceId', ctrl.deleteDevice);

// Upravljanje pametnim utičnicama
devicesRouter.get('/devices/:deviceId/plug', ctrl.getPlugForDevice);
devicesRouter.post('/devices/:deviceId/plug', ctrl.attachPlugToDevice);
devicesRouter.put('/devices/:deviceId/plug', ctrl.updatePlugForDevice);
