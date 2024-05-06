"use strict";

import HttpService from "../middleware/httpservice";
const folderRoutesObject = {
    insurance: 'insuranceServiceUrl',
    superadmin: 'superadminServiceUrl',
    labimagingdentaloptical: 'labimagingdentalopticalServiceUrl',
    pharmacy: 'pharmacyServiceUrl',
    hospital: 'hospitalServiceUrl'
}

const getModuleName = (req, res) => {
    const moduleName = req.query.module_name
    if (!moduleName) return res.status(500).json({
        message: 'Module name missing',
        param: 'module_name'
    })
    const route_name = folderRoutesObject[moduleName]
    if (!route_name) return res.status(500).json({
        message: `Module not found for ${moduleName} module name`,
    })

    return route_name;
}
export const addRole = async (req, res) => {
    const module_name = getModuleName(req, res);
    HttpService.postWithAuth(req, res, 'role/add-role', module_name);
}
export const allRole = async (req, res) => {
    const module_name = getModuleName(req, res);
    HttpService.getWithAuth(req, res, 'role/all-role', module_name);
}
export const updateRole = async (req, res) => {
    const module_name = getModuleName(req, res);
    HttpService.postWithAuth(req, res, 'role/update-role', module_name);
}
export const deleteRole = async (req, res) => {
    const module_name = getModuleName(req, res);
    HttpService.postWithAuth(req, res, 'role/delete-role', module_name);
}
export const addMenu = async (req, res) => {
    const module_name = getModuleName(req, res);
    HttpService.postWithAuth(req, res, 'menu/add-menu', module_name);
}
export const editMenu = async (req, res) => {
    const module_name = getModuleName(req, res);
    HttpService.postWithAuth(req, res, 'menu/edit-menu', module_name);
}
export const allMenu = async (req, res) => {
    const module_name = getModuleName(req, res);
    HttpService.getWithAuth(req, res, 'menu/all-menus', module_name);
}
export const allSubmenu = async (req, res) => {
    const module_name = getModuleName(req, res);
    HttpService.getWithAuth(req, res, 'menu/all-submenus', module_name);
}
export const addPermission = async (req, res) => {
    const module_name = getModuleName(req, res);
    HttpService.postWithAuth(req, res, 'menu/add-perm', module_name);
}
export const addUserMenuPermission = async (req, res) => {
    const module_name = getModuleName(req, res);
    HttpService.postWithAuth(req, res, 'menu/add-user-menu', module_name);
}
export const allUserMenuPermission = async (req, res) => {
    const module_name = getModuleName(req, res);
    HttpService.getWithAuth(req, res, 'menu/all-user-menu', module_name);
}
export const editUserMenuPermission = async (req, res) => {
    const module_name = getModuleName(req, res);
    HttpService.postWithAuth(req, res, 'menu/edit-user-menu', module_name);
}
export const addSubmenuPermission = async (req, res) => {
    const module_name = getModuleName(req, res);
    HttpService.postWithAuth(req, res, 'menu/add-submenu-permission', module_name);
}
export const getSubmenuByUser = async (req, res) => {
    const module_name = getModuleName(req, res);
    HttpService.getWithAuth(req, res, 'menu/get-submenu-by-user', module_name);
}