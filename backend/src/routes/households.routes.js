import express from "express";

import {
    listHouseholds,
    createHousehold,
    getHousehold,
    updateHousehold,
    deleteHousehold,
    listRooms,
    createRoom,
    updateRoom,
    deleteRoom,
    getStats
} from "../controllers/households.controller.js";

export const householdsRouter = express.Router();

// /api/households

householdsRouter.get("/", listHouseholds);
householdsRouter.post("/", createHousehold);
householdsRouter.get("/:id/stats", getStats);
householdsRouter.get("/:id", getHousehold);
householdsRouter.put("/:id", updateHousehold);
householdsRouter.delete("/:id", deleteHousehold);

//rooms
householdsRouter.get("/:id/rooms", listRooms);
householdsRouter.post("/:id/rooms", createRoom);
householdsRouter.put("/:id/rooms/:roomId", updateRoom);
householdsRouter.delete("/:id/rooms/:roomId", deleteRoom);

