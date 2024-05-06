import express from "express";
import { addRole, allRole, updateRole, deleteRole } from "../controller/rolesAndPermissionController";

const roleRoute = express.Router()

//Roles and permission
roleRoute.post('/add-role', addRole)
roleRoute.get('/all-role', allRole)
roleRoute.post('/update-role', updateRole)
roleRoute.post('/delete-role', deleteRole)

export default roleRoute;