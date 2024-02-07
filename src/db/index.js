import mongoose from "mongoose";
import {DB_NAME} from "../constants.js";

const connectDB=async ()=>{
    try{
       const ConnectionInstance= await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)
       console.log(`\nMongoDB connected!! DB HOST:${ConnectionInstance.connection.host}`);
    }
    catch(err){
        console.log("MongoDB correction error ", err);
        process.exit(1);
    }
}

export default connectDB