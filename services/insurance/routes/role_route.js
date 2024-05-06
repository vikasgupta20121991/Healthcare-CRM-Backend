"use strict";

import express from "express";
import { verifyToken } from "../helpers/verifyToken";
const roleController = require("../controllers/roles/role");
const roleRoute = express.Router();

// roleRoute.use(verifyToken);

roleRoute.post("/add-role", roleController.add_role);
roleRoute.get("/all-role", roleController.all_role);
roleRoute.post("/update-role", roleController.update_role);
roleRoute.post("/delete-role", roleController.delete_role);

export default roleRoute;