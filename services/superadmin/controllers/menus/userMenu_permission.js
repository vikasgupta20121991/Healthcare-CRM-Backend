import MenuPermission from "../../models/rolesandpermission/menu_permission";
import PortalUser from "../../models/superadmin/portal_user";
import { handleResponse } from "../../helpers/transmission";
import mongoose from "mongoose";
const NodeCache = require("node-cache");
const myCache = new NodeCache();


const add_user_menu = async (req, res) => {
    const { menu_array, children_array } = req.body
    let menusArray = []
    await MenuPermission.deleteMany({ user_id: req.body.user_id })
    for (const menuID in menu_array) {
        menusArray.push({
            menu_id: menuID,
            role_id: null,
            permission_id: null,
            user_id: req.body.user_id,
            menu_order: menu_array[menuID]
        })
        if (menuID.toString() in children_array) {
            for (const childMenu of children_array[menuID]) {
                menusArray.push({
                    menu_id: childMenu,
                    role_id: null,
                    permission_id: null,
                    user_id: req.body.user_id,
                    menu_order: menu_array[menuID],
                    parent_id: menuID
                })
            }
        }
    }
    try {
        const result = await MenuPermission.insertMany(menusArray)
        if (result) {
            handleResponse(req, res, 200, {
                status: true,
                body: result,
                message: "Permission Added succuessfully",
                errorCode: null,
            })
        } else {
            handleResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to add permission to user",
                errorCode: "INTERNAL_SERVER_ERROR",
            })
        }

    } catch (error) {
        console.log(error, 'error');
        handleResponse(req, res, 500, {
            status: false,
            body: null,
            message: "failed to add permission to user",
            errorCode: "INTERNAL_SERVER_ERROR",
        })
    }

}

const all_user_menu = async (req, res) => {
    try {
        const perms = await MenuPermission.find({ user_id: req.query.user_id }).sort({ menu_order: 1 })
            .populate({
                path: 'role_id'
            })
            .populate({
                path: 'menu_id'
            })
            .populate({
                path: 'permission_id'
            });
        handleResponse(req, res, 200, {
            status: true,
            body: perms,
            message: "successfully fetched user menu",
            errorCode: null,
        })
    } catch (error) {
        console.log(error, "log error");
        handleResponse(req, res, 500, {
            status: false,
            body: null,
            message: "failed to fetched user menu",
            errorCode: "INTERNAL_SERVER_ERROR",
        })
    }

}
function getAllCacheData() {
    const keys = myCache.keys();
    const data = myCache.mget(keys);
    const result = [];

    // Combine keys and values into an array of objects
    for (let i = 0; i < keys.length; i++) {
        result.push({ key: keys[i], value: data[i] });
    }

    return result;
}

// const all_user_menu = async (req, res) => {
//     try {
//         // myCache.del( req.query.user_id + "userpermission" );
//         console.log(getAllCacheData(), "getAllCacheData");
//         var value = myCache.get(req.query.user_id + "userpermission");
//         // console.log(value, "valuemenu");
//         if (value == undefined) {
//             console.log("check value");
//             const perms = await MenuPermission.find({ user_id: req.query.user_id }).sort({ menu_order: 1 })
//                 .populate({
//                     path: 'role_id'
//                 })
//                 .populate({
//                     path: 'menu_id'
//                 })
//                 .populate({
//                     path: 'permission_id'
//                 });
//             // console.log(perms, "perms");
//             if(perms.length > 0){

//                 var success = myCache.set(req.query.user_id + "userpermission", perms, 1000);
//             }

//             handleResponse(req, res, 200, {
//                 status: true,
//                 body: perms,
//                 message: "successfully fetched user menu",
//                 errorCode: null,
//             })
//         } else {
//             console.log("elseelse");
//             handleResponse(req, res, 200, {
//                 status: true,
//                 body: value,
//                 message: "successfully fetched user menu",
//                 errorCode: null,
//             })
//         }
//     } catch (error) {
//         console.log(error, "log error");
//         handleResponse(req, res, 500, {
//             status: false,
//             body: null,
//             message: "failed to fetched user menu",
//             errorCode: "INTERNAL_SERVER_ERROR",
//         })
//     }

// }


const edit_user_menu = async (req, res) => {
    //console.log(req);
    try {
        const menu = {
            menu_id: req.body.menu_id,
            role_id: req.body.role_id,
            permission_id: req.body.permission_id
        };
        await MenuPermission.findByIdAndUpdate(
            { _id: req.body.id },
            menu
        ).then((docs) => handleResponse(req, res, 200, {
            status: true,
            body: null,
            message: "successfully data updated",
            errorCode: null,
        })).catch((err) => {
            console.log(err);
            handleResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to update data",
                errorCode: "INTERNAL_SERVER_ERROR",
            })
        });

    } catch (error) {
        console.log(error);
        handleResponse(req, res, 500, {
            status: false,
            body: null,
            message: "failed to update data",
            errorCode: "INTERNAL_SERVER_ERROR",
        })
    }
}

const addSubmenuPermission = async (req, res) => {
    //console.log(req);
    try {
        const { portal_user_id, permission_data } = req.body
        const permissionObject = {
            permissions: permission_data,
        };
        await PortalUser.findOneAndUpdate(
            { superadmin_id: mongoose.Types.ObjectId(portal_user_id) },
            permissionObject
        ).then((docs) => handleResponse(req, res, 200, {
            status: true,
            body: permissionObject,
            message: "successfully data updated",
            errorCode: null,
        })).catch((err) => {
            console.log(err);
            handleResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to update data",
                errorCode: "INTERNAL_SERVER_ERROR",
            })
        });

    } catch (error) {
        console.log(error);
        handleResponse(req, res, 500, {
            status: false,
            body: null,
            message: "failed to update data",
            errorCode: "INTERNAL_SERVER_ERROR",
        })
    }
}

const getSubmenuByUser = async (req, res) => {
    //console.log(req);
    try {
        const { user_id } = req.query
        const userPermission = await PortalUser.findOne({ superadmin_id: user_id }).select('permissions').exec()
        handleResponse(req, res, 200, {
            status: true,
            body: {
                user_permissions: userPermission
            },
            message: "successfully fetched permissions",
            errorCode: null,
        })
    } catch (error) {
        console.log(error);
        handleResponse(req, res, 500, {
            status: false,
            body: null,
            message: "failed to update data",
            errorCode: "INTERNAL_SERVER_ERROR",
        })
    }
}

module.exports = {
    add_user_menu,
    edit_user_menu,
    all_user_menu,
    addSubmenuPermission,
    getSubmenuByUser
}
