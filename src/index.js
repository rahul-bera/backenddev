// require('dotenv').config({path: './env'})
import dotenv from "dotenv"
import connectDB from "./db/index.js";
// import {app} from './app.js'
dotenv.config({
    path: './.env'
})

// import mongoose from "mongoose";
// import { DB_NAME } from "./constants"; //basically we import the database name from constants.js file
// import connectDB from "./db";


connectDB()













/*this is first approach to connect database 
;( async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("errror", (error) => {
            console.log("ERROR: ", error);
            throw error
        })

        app.listen(process.env.PORT, () => {
            console.log(`App is listening on port ${process.env.PORT}`);
        })

    } catch (error) {
        console.error("ERROR: ", error)
        throw err
    }
})() //at the first we used semicolon because of the cleaning purpose , it is a good practice .*/