"use strict";

import LeaveManagement from "../models/leave_management";
import mongoose from "mongoose";
import { sendResponse } from "../helpers/transmission";
import HospitalAdminInfo from "../models/hospital_admin_info";

// Add leave
export const addLeave = async (req, res) => {
  const {
    role_type,
    leave_type,
    subject,
    reason,
    from_date,
    to_date,
    created_by,
    for_user,
    status,
    sent_to,
  } = req.body;

  try {
    let result = new LeaveManagement({
      role_type,
      leave_type,
      subject,
      reason,
      from_date,
      to_date,
      created_by,
      for_user,
      status,
      sent_to,
    });
    const resObject = await result.save();

    sendResponse(req, res, 200, {
      status: true,
      message: "Add leave successfully",
      errorCode: null,
      result: resObject,
    });
  } catch (error) {
    console.log("error", error);
    sendResponse(req, res, 500, {
      status: false,
      body: null,
      message: "failed to add leave",
      errorCode: "INTERNAL_SERVER_ERROR",
    });
  }
};

// Leave List
export const getAllMyLeave = async (req, res) => {
  try {
    const {
      for_portal_user,
      page,
      limit,
      searchKey,
      createdDate,
      updatedDate,
    } = req.query;
    var sort = req.query.sort
    var sortingarray = {};
    if (sort != 'undefined' && sort != '' && sort != undefined)  {
        var keynew = sort.split(":")[0];
        var value = sort.split(":")[1];
        sortingarray[keynew] = value;
    }else{
        sortingarray['createdAt'] = -1;
    }
    const filter = {};
    
    if (searchKey != "") {
      filter["$or"] = [
        {
          leave_type: { $regex: searchKey, $options: "i" },
        },
      ];
    }
    var dateFilter = {};
    if (createdDate && createdDate !== "") {
      const createdDateObj = new Date(createdDate);
      const updatedDateObj = new Date(updatedDate);
      dateFilter.createdAt = { $gte: createdDateObj, $lte: updatedDateObj };
      // myFilter.createdAt = { $lte: updatedDateObj };
    }

    const listdata = await LeaveManagement.find({      
created_by: for_portal_user,
      ...filter,
      ...dateFilter,
    })
      .sort(sortingarray)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await LeaveManagement.countDocuments({created_by: for_portal_user,
      ...filter,
      ...dateFilter,});

    sendResponse(req, res, 200, {
      status: true,
      body: {
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        totalRecords: count,
        listdata,
      },
      message: `List Fetch successfully`,
      errorCode: null,
    });
  } catch (err) {
    console.log(err);
    sendResponse(req, res, 500, {
      status: false,
      data: err,
      message: `failed to fetched list`,
      errorCode: "INTERNAL_SERVER_ERROR",
    });
  }
};

// Hospital Dropdown list
export const hospitalIds = async (req, res) => {
  try {
    const userArray = req.body;
    const userObjectIds = userArray.map((id) => mongoose.Types.ObjectId(id));
    const names = await HospitalAdminInfo.aggregate([
      { $match: { for_portal_user: { $in: userObjectIds } } },
      { $project: { for_portal_user: 1, hospital_name: 1 } },
    ]);
    console.log("Names associated with IDs:", names);
    sendResponse(req, res, 200, {
      status: true,
      message: "Add leave successfully",
      errorCode: null,
      result: names,
    });
  } catch (error) {
    sendResponse(req, res, 500, {
      status: false,
      body: null,
      message: "failed ",
      errorCode: "INTERNAL_SERVER_ERROR",
    });
  }
};

// Hospital Leave List
// export const getAllParticularHospitalLeave = async (req, res) => {
//   try {
//     const {
//       for_user,
//       page,
//       limit,
//       searchKey,
//       createdDate,
//       updatedDate,
//     } = req.query;

//     const filter = {};
//     // const filterDate = {};

//     // if (searchKey && searchKey !== "") {
//     //   filter.$or = [{ leave_type: { $regex: searchKey } }];
//     // }
//     if (searchKey != "") {
//       filter["$or"] = [
//         {
//           leave_type: { $regex: searchKey, $options: "i" },
//         },
//       ];
//     }
//     var dateFilter = {};
//     if (createdDate && createdDate !== "") {
//       const createdDateObj = new Date(createdDate);
//       const updatedDateObj = new Date(updatedDate);
//       dateFilter.createdAt = { $gte: createdDateObj, $lte: updatedDateObj };
//       // myFilter.createdAt = { $lte: updatedDateObj };
//     }

//     const listdata = await LeaveManagement.find({
//       for_user: for_user,
//       ...filter,
//       ...dateFilter,
//     })
//       .sort({ createdAt: -1 })
//       .limit(limit * 1)
//       .skip((page - 1) * limit)
//       .exec();

//     const count = await LeaveManagement.countDocuments({});

//     sendResponse(req, res, 200, {
//       status: true,
//       body: {
//         totalPages: Math.ceil(count / limit),
//         currentPage: page,
//         totalRecords: count,
//         listdata,
//       },
//       message: `List Fetch successfully`,
//       errorCode: null,
//     });
//   } catch (err) {
//     console.log(err);
//     sendResponse(req, res, 500, {
//       status: false,
//       data: err,
//       message: `failed to fetched list`,
//       errorCode: "INTERNAL_SERVER_ERROR",
//     });
//   }
// };


export const getAllParticularHospitalLeave = async (req, res) => {
  try {
    const { page, limit, searchKey, createdDate, updatedDate } = req.query;
    var sort = req.query.sort
    var sortingarray = {};
    if (sort != 'undefined' && sort != '' && sort != undefined)  {
        var keynew = sort.split(":")[0];
        var value = sort.split(":")[1];
        sortingarray[keynew] = Number(value);
    }else{
        sortingarray['for_portal_user.createdAt'] = -1;
    }
    var dateFilter = {};
    if (createdDate && createdDate !== "") {
      const createdDateObj = new Date(createdDate);
      const updatedDateObj = new Date(updatedDate);
      dateFilter.createdAt = { $gte: createdDateObj, $lte: updatedDateObj };
      // myFilter.createdAt = { $lte: updatedDateObj };
    }
    const filter = {
      sent_to: mongoose.Types.ObjectId(req.query.sent_to),
      role_type: "INDIVIDUAL_DOCTOR",
      ...dateFilter
      // status:"0"
    };

    let aggregate = [
      { $match: filter },
      {
        $lookup: {
          from: "basicinfos",
          localField: "created_by",
          foreignField: "for_portal_user",
          as: "DoctorData",
        },
      },
      { $unwind: "$DoctorData" },
    ];

   
    if (searchKey && searchKey !== "") {
      filter["$or"] = [
        { leave_type: { $regex: searchKey || "", $options: "i" } },
        { "StaffData.name": { $regex: `.*${searchKey}.*`, $options: "i" } },
        { subject: { $regex: searchKey || "", $options: "i" } },
        { reason: { $regex: searchKey || "", $options: "i" } }
      ];
    }

    const totalCount = await LeaveManagement.aggregate(aggregate);

    aggregate.push(
      { $sort: sortingarray },
      { $skip: (page - 1) * limit },
      { $limit: limit * 1 }
    );
    const listdata = await LeaveManagement.aggregate(aggregate);
    sendResponse(req, res, 200, {
      status: true,
      body: {
        totalPages: Math.ceil(totalCount.length / limit),
        currentPage: page,
        totalRecords: totalCount.length,
        listdata,
      },
      message: `List Fetch successfully`,
      errorCode: null,
    });
  } catch (err) {
    console.log(err);
    sendResponse(req, res, 500, {
      status: false,
      data: err,
      message: `failed to fetched list`,
      errorCode: "INTERNAL_SERVER_ERROR",
    });
  }
};

export const LeaveAccept = async (req, res) => {
  try {
    let jsondata = {
      status: req.body.status,
    };
    const result = await LeaveManagement.updateOne(
      { _id: mongoose.Types.ObjectId(req.body._id) },
      { $set: jsondata },
      { new: true }
    );
    if (!result) {
      sendResponse(req, res, 400, {
        status: false,
        message: "Do not Successfully Leave Updated",
        errorCode: null,
        result: result,
      });
    } else {
      sendResponse(req, res, 200, {
        status: true,
        message: "Successfully Leave Accepted",
        errorCode: null,
        result: result,
      });
    }
  } catch (e) {
    console.log("e", e);
    res.send({
      status: false,
      messgae: "Oops!! something went wrong",
    });
  }
};

export const LeaveReject = async (req, res) => {
  try {
    let jsondata = {
      status: req.body.status,
    };
    const result = await LeaveManagement.updateOne(
      { _id: mongoose.Types.ObjectId(req.body._id) },
      { $set: jsondata },
      { new: true }
    );
    if (!result) {
      sendResponse(req, res, 400, {
        status: false,
        message: "Do not Successfully Leave Reject",
        errorCode: null,
        result: result,
      });
    } else {
      sendResponse(req, res, 200, {
        status: true,
        message: "Successfully Leave Reject",
        errorCode: null,
        result: result,
      });
    }
  } catch (e) {
    res.send({
      status: false,
      messgae: "Oops!! something went wrong",
    });
  }
};

export const getAllMyDoctorStaffLeave = async (req, res) => {
  try {
    const { page, limit, searchKey, createdDate, updatedDate } = req.query;
    var sort = req.query.sort
    var sortingarray = {};
    if (sort != 'undefined' && sort != '' && sort != undefined)  {
        var keynew = sort.split(":")[0];
        var value = sort.split(":")[1];
        sortingarray[keynew] = value;
    }else{
        sortingarray['createdAt'] = -1;
    }
    const filter = {};
    // const filterDate = {};

    // if (searchKey && searchKey !== "") {
    //   filter.$or = [{ leave_type: { $regex: searchKey } }];
    // }
    if (searchKey && typeof searchKey === "string" && searchKey.trim() !== "") {
      filter["$or"] = [
        {
          leave_type: { $regex: searchKey, $options: "i" },
        },
      ];
    }

    var dateFilter = {};
    if (createdDate && createdDate !== "") {
      const createdDateObj = new Date(createdDate);
      const updatedDateObj = new Date(updatedDate);
      dateFilter.createdAt = { $gte: createdDateObj, $lte: updatedDateObj };
      // myFilter.createdAt = { $lte: updatedDateObj };
    }

    const listdata = await LeaveManagement.find({
      created_by: mongoose.Types.ObjectId(req.query.created_by),
      ...filter,
      ...dateFilter,
    })
      .sort(sortingarray)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await LeaveManagement.countDocuments({});
    sendResponse(req, res, 200, {
      status: true,
      body: {
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        totalRecords: listdata.length,
        listdata,
      },
      message: `List Fetch successfully`,
      errorCode: null,
    });
  } catch (err) {
    console.log(err);
    sendResponse(req, res, 500, {
      status: false,
      data: err,
      message: `failed to fetched list`,
      errorCode: "INTERNAL_SERVER_ERROR",
    });
  }
};

// export const getAllMyStaffLeaves = async (req, res) => {
//   try {
//     const {

//       page,
//       limit,
//       searchKey,
//       createdDate,
//       updatedDate,
//     } = req.query;

//     const filter = {};
//     // const filterDate = {};

//     // if (searchKey && searchKey !== "") {
//     //   filter.$or = [{ leave_type: { $regex: searchKey } }];
//     // }
//     if (searchKey && typeof searchKey === 'string' && searchKey.trim() !== "") {
//       filter["$or"] = [
//         {
//           leave_type: { $regex: searchKey, $options: "i" },
//         },
//       ];
//     }

//     var dateFilter = {};
//     if (createdDate && createdDate !== "") {
//       const createdDateObj = new Date(createdDate);
//       const updatedDateObj = new Date(updatedDate);
//       dateFilter.createdAt = { $gte: createdDateObj, $lte: updatedDateObj };
//       // myFilter.createdAt = { $lte: updatedDateObj };
//     }

//     const listdata = await LeaveManagement.find({
//       for_user: mongoose.Types.ObjectId(req.query.for_portal_user),
//       ...filter,
//       ...dateFilter,
//     })
//       .sort({ createdAt: -1 })
//       .limit(limit * 1)
//       .skip((page - 1) * limit)
//       .exec();

//     const count = await LeaveManagement.countDocuments({});
// console.log("count",count);
//     sendResponse(req, res, 200, {
//       status: true,
//       body: {
//         totalPages: Math.ceil(count / limit),
//         currentPage: page,
//         totalRecords: listdata.length,
//         listdata,
//       },
//       message: `List Fetch successfully`,
//       errorCode: null,
//     });
//   } catch (err) {
//     console.log(err);
//     sendResponse(req, res, 500, {
//       status: false,
//       data: err,
//       message: `failed to fetched list`,
//       errorCode: "INTERNAL_SERVER_ERROR",
//     });
//   }
// };

export const getAllMyStaffLeaves = async (req, res) => {
  console.log("req.query", req.query);
  try {
    const { page, limit, searchKey, createdDate, updatedDate } = req.query;
    var sort = req.query.sort
    var sortingarray = {};
    if (sort != 'undefined' && sort != '' && sort != undefined)  {
        var keynew = sort.split(":")[0];
        var value = sort.split(":")[1];
        sortingarray[keynew] = Number(value);
    }else{
        sortingarray['createdAt'] = -1;
    }
    var dateFilter = {};
    if (createdDate && createdDate !== "") {
      const createdDateObj = new Date(createdDate);
      const updatedDateObj = new Date(updatedDate);
      dateFilter.createdAt = { $gte: createdDateObj, $lte: updatedDateObj };
      // myFilter.createdAt = { $lte: updatedDateObj };
    }
    const filter = {
      sent_to: mongoose.Types.ObjectId(req.query.sent_to),
      ...dateFilter,
      // status:"0"
    };

    let aggregate = [
      { $match: filter },
      {
        $lookup: {
          from: "profileinfos",
          localField: "created_by",
          foreignField: "for_portal_user",
          as: "StaffData",
        },
      },
      { $unwind: "$StaffData" },
    ];

    if (searchKey && searchKey !== "") {
      const regex = new RegExp(searchKey, "i");
      aggregate.push({ $match: { leave_type: regex } });
    }

    const totalCount = await LeaveManagement.aggregate(aggregate);

    aggregate.push(
      { $sort: sortingarray},
      { $skip: (page - 1) * limit },
      { $limit: limit * 1 }
    );
    const listdata = await LeaveManagement.aggregate(aggregate);
    sendResponse(req, res, 200, {
      status: true,
      body: {
        totalPages: Math.ceil(totalCount.length / limit),
        currentPage: page,
        totalRecords: totalCount.length,
        listdata,
      },
      message: `List Fetch successfully`,
      errorCode: null,
    });
  } catch (err) {
    console.log(err);
    sendResponse(req, res, 500, {
      status: false,
      data: err,
      message: `failed to fetched list`,
      errorCode: "INTERNAL_SERVER_ERROR",
    });
  }
};

export const StaffLeaveAccept = async (req, res) => {
  try {
    let jsondata = {
      status: req.body.status,
    };
    const result = await LeaveManagement.updateOne(
      { _id: mongoose.Types.ObjectId(req.body._id) },
      { $set: jsondata },
      { new: true }
    );
    if (!result) {
      sendResponse(req, res, 400, {
        status: false,
        message: "Do not Successfully Leave Updated",
        errorCode: null,
        result: result,
      });
    } else {
      sendResponse(req, res, 200, {
        status: true,
        message: "Successfully Leave Accepted",
        errorCode: null,
        result: result,
      });
    }
  } catch (e) {
    console.log("e", e);
    res.send({
      status: false,
      messgae: "Oops!! something went wrong",
    });
  }
};

export const StaffLeaveReject = async (req, res) => {
  try {
    let jsondata = {
      status: req.body.status,
    };
    const result = await LeaveManagement.updateOne(
      { _id: mongoose.Types.ObjectId(req.body._id) },
      { $set: jsondata },
      { new: true }
    );
    if (!result) {
      sendResponse(req, res, 400, {
        status: false,
        message: "Do not Successfully Leave Reject",
        errorCode: null,
        result: result,
      });
    } else {
      sendResponse(req, res, 200, {
        status: true,
        message: "Successfully Leave Reject",
        errorCode: null,
        result: result,
      });
    }
  } catch (e) {
    res.send({
      status: false,
      messgae: "Oops!! something went wrong",
    });
  }
};

export const getAllMyHospitalStaffLeave = async (req, res) => {
  try {
    const { page, limit, searchKey, createdDate, updatedDate } = req.query;
    var sort = req.query.sort
    var sortingarray = {};
    if (sort != 'undefined' && sort != '' && sort != undefined)  {
        var keynew = sort.split(":")[0];
        var value = sort.split(":")[1];
        sortingarray[keynew] = value;
    } else {
        sortingarray['createdAt'] = -1;
    }
    const filter = {};
    // const filterDate = {};

    // if (searchKey && searchKey !== "") {
    //   filter.$or = [{ leave_type: { $regex: searchKey } }];
    // }
    if (searchKey && typeof searchKey === "string" && searchKey.trim() !== "") {
      filter["$or"] = [
        {
          leave_type: { $regex: searchKey, $options: "i" },
        },
      ];
    }

    var dateFilter = {};
    if (createdDate && createdDate !== "") {
      const createdDateObj = new Date(createdDate);
      const updatedDateObj = new Date(updatedDate);
      dateFilter.createdAt = { $gte: createdDateObj, $lte: updatedDateObj };
      // myFilter.createdAt = { $lte: updatedDateObj };
    }

    const listdata = await LeaveManagement.find({
      created_by: mongoose.Types.ObjectId(req.query.created_by),
      ...filter,
      ...dateFilter,
    })
      .sort(sortingarray)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await LeaveManagement.countDocuments({});
    console.log("count", count);
    sendResponse(req, res, 200, {
      status: true,
      body: {
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        totalRecords: listdata.length,
        listdata,
      },
      message: `List Fetch successfully`,
      errorCode: null,
    });
  } catch (err) {
    console.log(err);
    sendResponse(req, res, 500, {
      status: false,
      data: err,
      message: `failed to fetched list`,
      errorCode: "INTERNAL_SERVER_ERROR",
    });
  }
};

export const getAllMyHospitalStaffLeaves = async (req, res) => {
  console.log("req.query", req.query);
  try {
    const { page, limit, searchKey, createdDate, updatedDate } = req.query;
    var sort = req.query.sort
    var sortingarray = {};
    if (sort != 'undefined' && sort != '' && sort != undefined)  {
        var keynew = sort.split(":")[0];
        var value = sort.split(":")[1];
        sortingarray[keynew] = Number(value);
    }else{
        sortingarray['for_portal_user.createdAt'] = -1;
    }
    var dateFilter = {};
    if (createdDate && createdDate !== "") {
      const createdDateObj = new Date(createdDate);
      const updatedDateObj = new Date(updatedDate);
      dateFilter.createdAt = { $gte: createdDateObj, $lte: updatedDateObj };
      // myFilter.createdAt = { $lte: updatedDateObj };
    }
    const filter = {
      sent_to: mongoose.Types.ObjectId(req.query.sent_to),
      role_type: "HOSPITAL_STAFF",
      ...dateFilter,
      // status:"0"
    };

    let aggregate = [
      { $match: filter },
      {
        $lookup: {
          from: "profileinfos",
          localField: "created_by",
          foreignField: "_id",
          as: "StaffData",
        },
      },
      { $unwind: "$StaffData" },
    ];

    if (searchKey && searchKey !== "") {
      filter["$or"] = [
        { leave_type: { $regex: searchKey || "", $options: "i" } },
        { "StaffData.name": { $regex: `.*${searchKey}.*`, $options: "i" } },
        { subject: { $regex: searchKey || "", $options: "i" } },
        { reason: { $regex: searchKey || "", $options: "i" } }
      ];
    }

    const totalCount = await LeaveManagement.aggregate(aggregate);

    aggregate.push(
      { $sort: sortingarray },
      { $skip: (page - 1) * limit },
      { $limit: limit * 1 }
    );
    const listdata = await LeaveManagement.aggregate(aggregate);
    console.log("listdata",listdata);
    sendResponse(req, res, 200, {
      status: true,
      body: {
        totalPages: Math.ceil(totalCount.length / limit),
        currentPage: page,
        totalRecords: totalCount.length,
        listdata,
      },
      message: `List Fetch successfully`,
      errorCode: null,
    });
  } catch (err) {
    console.log(err);
    sendResponse(req, res, 500, {
      status: false,
      data: err,
      message: `failed to fetched list`,
      errorCode: "INTERNAL_SERVER_ERROR",
    });
  }
};

// 


export const HospitalStaffLeaveAccept = async (req, res) => {
  try {
    let jsondata = {
      status: req.body.status,
    };
    const result = await LeaveManagement.updateOne(
      { _id: mongoose.Types.ObjectId(req.body._id) },
      { $set: jsondata },
      { new: true }
    );
    if (!result) {
      sendResponse(req, res, 400, {
        status: false,
        message: "Do not Successfully Leave Updated",
        errorCode: null,
        result: result,
      });
    } else {
      sendResponse(req, res, 200, {
        status: true,
        message: "Successfully Leave Accepted",
        errorCode: null,
        result: result,
      });
    }
  } catch (e) {
    console.log("e", e);
    res.send({
      status: false,
      messgae: "Oops!! something went wrong",
    });
  }
};

export const HospitalStaffLeaveReject = async (req, res) => {
  try {
    let jsondata = {
      status: req.body.status,
    };
    const result = await LeaveManagement.updateOne(
      { _id: mongoose.Types.ObjectId(req.body._id) },
      { $set: jsondata },
      { new: true }
    );
    if (!result) {
      sendResponse(req, res, 400, {
        status: false,
        message: "Do not Successfully Leave Reject",
        errorCode: null,
        result: result,
      });
    } else {
      sendResponse(req, res, 200, {
        status: true,
        message: "Successfully Leave Reject",
        errorCode: null,
        result: result,
      });
    }
  } catch (e) {
    res.send({
      status: false,
      messgae: "Oops!! something went wrong",
    });
  }
};