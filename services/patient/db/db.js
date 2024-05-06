import mongoose from 'mongoose';
import 'dotenv/config.js';

const config = require("../config/config.js").get();
const NODE_ENV = process.env.NODE_ENV || "local";

const { DB } = config;
var options = {};
if (NODE_ENV == "local") {
    options = {
        user: '',
        pass: '',
    };
} else {
    options = {
        user: DB.USERNAME,
        pass: DB.PASSWORD,
    };
}

const MONGOURI = `mongodb://${DB.HOST}:${DB.PORT}/${DB.DATABASE}`;

const InitiateMongoServer = async () => {
    try {
        mongoose.set('strictQuery', true);
        await mongoose.connect(MONGOURI, options);
        console.log("Connected to patient DB !!",MONGOURI);
    } catch (e) {
        console.log(e);
        throw e;
    }
};

module.exports = InitiateMongoServer;
