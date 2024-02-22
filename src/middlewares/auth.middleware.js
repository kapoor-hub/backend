import { Apierror } from "../utils/Apierror";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken"
import { User } from "../models/user.models";
export const varifyJWT=asyncHandler(async(req,res,next)=>{
     try {
        const token=req.cookies?.accessToken ||req.header("Authorization")?.replace("Bearer","")
        if (!token) {
           throw new Apierror(401,"Unauthorised request")
        }
        const decoded_token=jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
   
       const user=await User.findById(decoded_token?._id).select("-password -refreshToken")
   
       if (!user) {
           
           throw new Apierror(401,"Invalid Access token")
       }
       req.user=user;
       next()
     } catch (error) {
        throw new Apierror(401, error?.message ||"Invalid access token")
     }

}) 