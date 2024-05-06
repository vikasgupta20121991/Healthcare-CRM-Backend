import Menus from "../../models/rolesandpermission/menu_model";
import Submenus from "../../models/rolesandpermission/submenu_model";
import Permission from "../../models/rolesandpermission/permission_model";
import { handleResponse } from "../../helpers/transmission";

const add_menu = async (req, res) => {
    const addMenu = new Menus({
        name: req.body.name,
        description: req.body.description,
        menu_order: req.body.menu_order,
        url: req.body.url,
        slug: req.body.slug,
        module_type: req.body.module_type,
        parent_id: req.body.parent_id,
        menu_icon: req.body.menu_icon,
        menu_icon_hover: req.body.menu_icon_hover,
        route_path: req.body.route_path
    });
    try {
        const dataResult = await addMenu.save((err, result) => {
            if (err) {
                handleResponse(req, res, 500, {
                    status: false,
                    body: null,
                    message: err.message ? err.message : "failed to add menu",
                    errorCode: err.code ? err.code : "INTERNAL_SERVER_ERROR",
                })
            }
            handleResponse(req, res, 200, {
                status: true,
                body: null,
                message: "Menu Added succuessfully",
                errorCode: null,
            })
        });

    } catch (error) {
        handleResponse(req, res, 500, {
            status: false,
            body: null,
            message: err.message ? err.message : "failed to add menu",
            errorCode: err.code ? err.code : "INTERNAL_SERVER_ERROR",
        })
    }

}

const all_menus = async (req, res) => {
    try {
        const menus = await Menus.find({ status: { $eq: 1 }, module_type: req.query.module_type }).sort({ 'menu_order': 1 });
        handleResponse(req, res, 200, {
            status: true,
            body: menus,
            message: "fetched all menus",
            errorCode: null,
        })
    } catch (error) {
        handleResponse(req, res, 500, {
            status: false,
            body: null,
            message: "failed to fetched all menus",
            errorCode: "INTERNAL_SERVER_ERROR",
        })
    }

}

const all_submenus = async (req, res) => {
    try {
        const submenus = await Submenus.find({ status: true, module_type: req.query.module_type });
        handleResponse(req, res, 200, {
            status: true,
            body: submenus,
            message: "fetched all submenus",
            errorCode: null,
        })
    } catch (error) {
        handleResponse(req, res, 500, {
            status: false,
            body: null,
            message: "failed to fetched all submenus",
            errorCode: "INTERNAL_SERVER_ERROR",
        })
    }

}

const edit_menu = async (req, res) => {
    //console.log(req);
    try {
        const menu = {
            name: req.body.name,
            description: req.body.description,
            menu_order: req.body.menu_order,
            url: req.body.url,
            slug: req.body.slug
        };
        await Menus.findByIdAndUpdate(
            { _id: req.body.id },
            menu
        ).then((docs) => handleResponse(req, res, 200, {
            status: true,
            body: null,
            message: "Menu updated succuessfully",
            errorCode: null,
        })).catch((err) => handleResponse(req, res, 500, {
            status: false,
            body: null,
            message: "failed to edit menu",
            errorCode: "INTERNAL_SERVER_ERROR",
        }));

    } catch (error) {
        res.json({ message: error });
    }
}

const delete_menu = async (req, res) => {
    //console.log(req);
    try {
        const role = {
            is_delete: req.body.is_delete
        };
        const updatedRole = await Role.findByIdAndUpdate(
            { _id: req.body.id },
            role
        );
        res.json(updatedRole);
    } catch (error) {
        res.json({ message: error });
    }
}


const add_perm = async (req, res) => {
    const addPerm = new Permission({
        menu_id: req.body.menu_id,
        perm_name: req.body.perm_name,
        perm_order:req.body.perm_order
    });
    try {
        await addPerm.save((err, result) => {
            if (err) {
                handleResponse(req, res, 500, {
                    status: false,
                    body: null,
                    message: "failed to add permission",
                    errorCode: "INTERNAL_SERVER_ERROR",
                })
            }
            handleResponse(req, res, 200, {
                status: true,
                body: null,
                message: "successfully added permission",
                errorCode: null,
            })
        });

    } catch (error) {
        handleResponse(req, res, 500, {
            status: false,
            body: null,
            message: "failed to add permission",
            errorCode: "INTERNAL_SERVER_ERROR",
        })
    }

}

const all_perms = async (req, res) => {
    try {
        const perms = await Permission.find({ status: { $eq: 1 } }).sort({ '_id': 1 });
        res.json(perms);
    } catch (error) {
        res.json({ message: error });
    }

}


const edit_perm = async (req, res) => {
    //console.log(req);
    try {
        const menu = {
            menu_id: req.body.menu_id,
            perm_name: req.body.perm_name,
            status: req.body.perm_name,
            perm_order:req.body.perm_order
        };
        await Menu.findByIdAndUpdate(
            { _id: req.body.id },
            menu
        ).then((docs) => res.json({
            status: true,
            message: "Data updated"
        })).catch((err) => res.status(500).send({ message: err }));

    } catch (error) {
        res.json({ message: error });
    }
}





module.exports = {
    add_menu,
    edit_menu,
    all_menus,
    all_submenus,
    add_perm,
    all_perms,
    edit_perm
}
