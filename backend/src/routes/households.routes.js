import express from "express";

import {
    listHouseholds,
    createHousehold,
    getHousehold,
    listRooms,
    createRoom
} from "../controllers/households.controller.js";

export const householdsRouter = express.Router();

// /api/households

householdsRouter.get("/", listHouseholds);
householdsRouter.post("/", createHousehold);
householdsRouter.get("/:id", getHousehold);

//rooms
householdsRouter.get("/:id/rooms", listRooms);
householdsRouter.post("/:id/rooms", createRoom);

