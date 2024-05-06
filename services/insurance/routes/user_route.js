"use strict";

import express from "express";
import { checkUserExistsOrNot } from "../controllers/user";
const user = express.Router();

user.get("/user-exists", checkUserExistsOrNot);

export default user;
