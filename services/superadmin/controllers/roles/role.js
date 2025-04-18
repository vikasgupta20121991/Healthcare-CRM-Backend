import Role from "../../models/rolesandpermission/role_model";
import roleCounter from "../../models/rolesandpermission/role_counter_model";
import PortalUser from "../../models/superadmin/portal_user";
import Superadmin from "../../models/superadmin/superadmin";


// utils
import { handleResponse } from "../../helpers/transmission";
import mongoose from "mongoose";

let seqId=0;
export const add_role = async (req, res) => {
    const roleName = req.body.name;
    console.log('sadasd');
    
    // Check if role with the same name exists
    // try {
    //     const existingRole = await Role.findOne({ name: roleName });
    //     if (existingRole) {
    //         handleResponse(req, res, 400, {
    //             status: false,
    //             body: null,
    //             message: "Role already exists with the same name",
    //             errorCode: "ROLE_ALREADY_EXISTS",
    //         });
    //         return;
    //     }
  // } catch (error) {
    //     handleResponse(req, res, 500, {
    //         status: false,
    //         body: null,
    //         message: "Failed to check role existence",
  //         errorCode: "INTERNAL_SERVER_ERROR",
    //     });
    //     return;
    // }

    roleCounter.findOneAndUpdate(
        { id: "autoval" },
        { "$inc": { "seq": 1 } },
        { new: true },
        async (err, cd) => {
            if (cd == null) {
                const newval = new roleCounter({ id: "autoval", seq: 1 });
                newval.save();
                seqId = 1;
            } else {
                seqId = cd.seq;
            }

            try{
                const { rolesArray, for_user } = req.body
                const list = rolesArray.map((singleData) => ({
                    ...singleData,
                    for_user,
                    role_id: seqId, // Assign seqId to role_id
                }));
                const namesToFind = list.map((item) => item.name);
                const foundItems = await Role.find({
                    name: { $in: namesToFind },
                    for_user: for_user,
                    is_delete:'No'
                });
                const CheckData = foundItems.map((item) => item.name);
                if (foundItems.length == 0) {
                    const savedRole = await Role.insertMany(list)
                    handleResponse(req, res, 200, {
                        status: true,
                        body: savedRole,
                        message: "Successfully add Role",
                        errorCode: null,
                    });
                } else {
                    handleResponse(req, res, 200, {
                        status: false,
                        message: `${CheckData} is already exist`,
                        errorCode: null,
                    });
                }
               }catch(error){
                console.log(error);
                handleResponse(req, res, 500, {
                  status: false,
                  body: null,
                  message: "failed to add Role",
                  errorCode: "INTERNAL_SERVER_ERROR",
                });
            }
            // const addRole = new Role({
            //     name: roleName,
            //     status: req.body.status,
            //     role_id: seqId,
            //     for_user: req.body.userId
            // });

            // try {
            //     const savedRole = await addRole.save();
            //     handleResponse(req, res, 200, {
            //         status: true,
            //         body: { savedRole },
            //         message: "Data Added Successfully",
            //         errorCode: null,
            //     });
            // } catch (error) {
            //     handleResponse(req, res, 500, {
            //         status: false,
            //         body: null,
            //         message: "Failed to add role",
            //         errorCode: "INTERNAL_SERVER_ERROR",
            //     });
            // }
        }
    )
}

// export const add_role = async (req, res) => {
//     console.log('sadasd');
//     roleCounter.findOneAndUpdate(
//         {id:"autoval"},
//         {"$inc":{"seq":1}},
//         {new:true},
//         (err,cd)=>{
            
//             if(cd==null){
//                 const newval = new roleCounter({id:"autoval",seq:1})
//                 newval.save();
//                 seqId = 1;
//             }else{
//                 seqId = cd.seq;
//             }

//             const addRole = new Role({
//                 name: req.body.name,
//                 status: req.body.status,
//                 role_id: seqId,
//                 for_user: req.body.userId
//             });
//             // res.json(addRole);
//             try {
//                 const savedRole = addRole.save((err,result)=>{
//                     if(err){
//                         handleResponse(req, res, 500, {
//                             status: false,
//                             body: null,
//                             message: "failed to add role",
//                             errorCode: "INTERNAL_SERVER_ERROR",
//                         })
//                     }
//                     handleResponse(req, res, 200, {
//                         status: true,
//                         body: {result},
//                         message: "Data Added Successfully",
//                         errorCode: null,
//                     })
//                 });
//             } catch (error) {
//                 handleResponse(req, res, 500, {
//                     status: false,
//                     body: null,
//                     message: "failed to add role",
//                     errorCode: "INTERNAL_SERVER_ERROR",
//                 })
//             }

//         }
//     )
// }
export const all_role = async (req, res) => {
    try {
        var { limit, page, searchText, userId } = req.query;
        let checkUser = await Superadmin.findOne({_id: mongoose.Types.ObjectId(userId)})

        if(checkUser.role === 'STAFF_USER'){
            let userFind =  await PortalUser.findOne({superadmin_id: mongoose.Types.ObjectId(userId)})
            userId = userFind?.for_staff           
        }
        
        var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined)  {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = value;
            } else {
                sortingarray['createdAt'] = -1;
            }
        var filter = { for_user: userId, is_delete: "No" }; // Update the filter to include 'is_delete: "No"'
        let roles = '';
        if (limit == undefined) {
            limit = 0;
        }
        if (page == undefined) {
            page = 1;
        }
        if (limit == 0) {
            roles = await Role.find(filter)
                .sort(sortingarray)
                .exec();
        }
        else {
            roles = await Role.find(filter)
                .sort(sortingarray)
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .exec();
        }

        console.log("filter==============", filter);

        const count = await Role.countDocuments(filter); // Count only the documents that match the filter

        handleResponse(req, res, 200, {
            status: true,
            body: {
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                totalCount: count,
                data: roles,
            },
            message: "Successfully fetched all roles",
            errorCode: null,
        })
    } catch (error) {
        handleResponse(req, res, 500, {
            status: false,
            body: null,
            message: "failed to fetched roles",
            errorCode: "INTERNAL_SERVER_ERROR",
        })
    }

}

// export const all_role = async (req, res) => {
//     console.log("runnnnnnnnnnnnnn")
//     try {
//         const { limit, page, searchText,userId} = req.query;
//         var filter = {}
//         const roles = await Role.find({ for_user: userId, is_delete: { $eq: 'No' } })
//         .sort({_id:1})
//         .limit(limit * 1)
//         .skip((page - 1) * limit)
//         .exec();

//         const count = await Role.countDocuments(roles);
//         handleResponse(req, res, 200, {
//             status: true,
//             body: {
//                  totalPages: Math.ceil(count / limit),
//                  currentPage: page,
//                  totalCount: count,
//                  data: roles,
//             },
//             message: "Successfully fetched all roles",
//             errorCode: null,
//         })
//       } catch (error) {
//         handleResponse(req, res, 500, {
//             status: false,
//             body: null,
//             message: "failed to fetched roles",
//             errorCode: "INTERNAL_SERVER_ERROR",
//         })
//       }
    
// }

export const update_role = async(req,res)=>{
    //console.log(req);
    try {
        const role = {
            name: req.body.name,
            status: req.body.status,
            is_delete:req.body.is_delete
        };
        const updatedRole = await Role.findByIdAndUpdate(
          { _id: req.body.id },
          role,
          { upsert: false, new: true }
        );
        handleResponse(req, res, 200, {
            status: true,
            body: updatedRole,
            message: "Successfully updated role",
            errorCode: null,
        })
      } catch (error) {
        handleResponse(req, res, 500, {
            status: false,
            body: null,
            message: "failed to update role",
            errorCode: "INTERNAL_SERVER_ERROR",
        })
      }
}

export const delete_role = async(req,res)=>{
    //console.log(req);
    try {
        const role = {
            is_delete:req.body.is_delete
        };
        await Role.findByIdAndUpdate(
          { _id: req.body.id },
          role,
          { upsert: false, new: true }
        );
        handleResponse(req, res, 200, {
            status: true,
            body: null,
            message: "Successfully deleted role",
            errorCode: null,
        })
      } catch (error) {
        handleResponse(req, res, 500, {
            status: false,
            body: null,
            message: "failed to delete role",
            errorCode: "INTERNAL_SERVER_ERROR",
        })
      }
}


// module.exports = {
//     add_role,
//     all_role,
//     update_role,
//     delete_role
// }
