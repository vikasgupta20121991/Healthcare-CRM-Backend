import Staff from "../../models/insurance/staff_model";
const { genSaltSync, hashSync, compareSync } = require('bcrypt');
// utils
import { sendResponse } from "../../helpers/transmission";



const add_staff = async (req, res) => {
    const salt = genSaltSync(10);
    let hashPassword = hashSync(req.body.password, salt);

    const addStaff = new Staff({
        name: req.body.staff_name,
        dob: req.body.dob,
        language: req.body.language,
        address: req.body.address,
        city: req.body.city,
        zip: req.body.zip,
        country: req.body.country,
        state: req.body.state,
        degree: req.body.degree,
        phone_no: req.body.phone_no,
        email: req.body.email,
        for_role: req.body.for_role,
        username: req.body.username,
        password: hashPassword,
        about_staff: req.body.about_staff,
    });
    //  res.json(addRole);
    try {
        const savedRole = await addStaff.save((err, result) => {
            if (err) {
                res.json({
                    status: false,
                    message: "Data not saved",
                    error: err
                });
            }
            res.json({
                status: 201,
                message: "Data save succuessfully",
                //data:result
            });

        });

    } catch (error) {
        res.json({ message: error });
    }
}


const edit_staff = async (req, res) => {
    const salt = genSaltSync(10);
    let hashPassword = hashSync(req.body.password, salt);

    const editStaff = {
        name: req.body.staff_name,
        dob: req.body.dob,
        language: req.body.language,
        address: req.body.address,
        city: req.body.city,
        zip: req.body.zip,
        country: req.body.country,
        state: req.body.state,
        degree: req.body.degree,
        phone_no: req.body.phone_no,
        email: req.body.email,
        for_role: req.body.for_role,
        username: req.body.username,
        password: hashPassword,
        about_staff: req.body.about_staff,
    };
    //  res.json(addRole);
    try {

        await Staff.findByIdAndUpdate(
            { _id: req.body.id },
            editStaff,
        ).then((docs) => res.json({
            status: true,
            message: "Data updated"
        })).catch((err) => res.status(500).send({ message: err }));

    } catch (error) {
        res.json({ message: error });
    }
}

const all_staff = async (req, res) => {
    try {
        const staffs = await Staff.find({ user_status: { $ne: 'Deleted' } }).sort({ '_id': 1 });

        res.json(staffs);
    } catch (error) {
        res.json({ message: error });
    }

}

const delete_staff = async (req, res) => {
    //console.log(req);
    try {
        const staff = {
            user_status: "Deleted"
        };
        await Staff.findByIdAndUpdate(
            req.body.id,
            staff
        ).then((docs) => res.json({
            status: true,
            message: "Record Deleted"
        })).catch((err) => res.status(500).send({ message: err }));

    } catch (error) {
        res.json({ message: error });
    }
}






module.exports = {
    add_staff,
    all_staff,
    edit_staff,
    delete_staff
}
