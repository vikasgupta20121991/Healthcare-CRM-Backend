import express from "express";
import { addMenu, editMenu, allMenu, allSubmenu, addPermission, addUserMenuPermission, allUserMenuPermission, editUserMenuPermission, addSubmenuPermission, getSubmenuByUser } from "../controller/rolesAndPermissionController";

const menuRoute = express.Router()

//Roles and permission
menuRoute.post('/add-menu', addMenu)
menuRoute.post('/edit-menu', editMenu)
menuRoute.get('/all-menus', allMenu)
menuRoute.get('/all-submenus', allSubmenu)

menuRoute.post('/add-perm', addPermission)
menuRoute.post('/add-user-menu', addUserMenuPermission)
menuRoute.get('/all-user-menu', allUserMenuPermission)
menuRoute.post('/edit-user-menu', editUserMenuPermission)
menuRoute.post('/add-submenu-permission', addSubmenuPermission)
menuRoute.get('/get-submenu-by-user', getSubmenuByUser)

export default menuRoute;