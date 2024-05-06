import express from "express";
import { 
    createSpeciality,
    specialityDelete, 
    specialityList, 
    specialityUpdate, 
} from "../controller/superadminController";
const individualDoctorRoute = express.Router()

//speciality 
individualDoctorRoute.post('/create-speciality', createSpeciality)
individualDoctorRoute.get('/speciality-list', specialityList)
individualDoctorRoute.put('/update-speciality', specialityUpdate)
individualDoctorRoute.delete('/delete-speciality', specialityDelete)

export default individualDoctorRoute;