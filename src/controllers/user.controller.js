import { asyncHandler } from "../utils/asyncHandler.js";
import { Apierror } from "../utils/Apierror.js";
import { User } from "../models/user.models.js";
import { uploadonCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/Apiresponse.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefereshTokens=async(userId)=>{
    try {
        const user=await User.findById(userId)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()
        user.refreshToken=refreshToken
        await user.save({ validateBeforeSave : false })

        return {accessToken , refreshToken}

    } catch (error) {
        throw new Apierror(500, "Something went wrong while generating refresh and access token")
    }
}
const registerUser = asyncHandler(async (req, res) => {
  //get user details from frontend
  //validation-not empty
  // check if user already exists:username,email
  // check for images,check for avatar
  // upload them to cloudinary,multer
  // create user object-create entry in DB
  //Remove password and refresh tokenfeild from response
  // Check for user creation
  // return res

  const { fullName, email, username, password } = req.body;
  console.log("email", email);

  if (
    [fullName, email, username, password].some((field) => field?.trim() == "")
  ) {
    throw new Apierror(400, "All fields are required");
  }
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new Apierror(409, "User or email already exist");
  }
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new Apierror(400, "Avatar feild is required");
  }
  const avatar = await uploadonCloudinary(avatarLocalPath);
  const coverImage = await uploadonCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new Apierror(400, "Avatar file is required");
  }
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new Apierror(500, "Something went wrong while entering the user");
  }
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
    // req body ->data
    // username or email
    // find the user
    // password check
    // access and refresh token
    // send cookie

    const {email,username,password}=req.body;

    if (!(username || email) ) {
        throw new Apierror(400, "Username or email is required");
    }

    const user=await User.findOne({
        $or:[{username},{email}]
    })

    if (!user) {
        throw new Apierror(404, "User does not exist")
    }

   const isPasswordValid= await user.isPasswordCorrect(password)

   if (!isPasswordValid) {
    throw new Apierror(401,"Invalid user credential")
   }

   const {accessToken,refreshToken}=await generateAccessAndRefereshTokens(user._id)

   const loggedInUser=User.findById(user._id).select("-password -refreshToken")
   const options={
    httpOnly: true,
    secure:true
   }

   return res
   .status(200)
   .cookie("accessToken",accessToken,options)
   .cookie("refreshToken",refreshToken,options)
   .json(
    new ApiResponse(200,
        {
            user:loggedInUser,accessToken,refreshToken
        },
        "User loggedin successfully"
        )
   )
});

const logoutUser=asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
        )

        const options={
            httpOnly:true,
            secure:true
        }
        return res
        .status(200)
        .clearCookie("accessToken",options)
        .clearCookie("refreshToken",options)
        .json(new ApiResponse(200, {}, "User logged out"))
})

const refreshAccessToken=asyncHandler(async(req,res)=>{
  const incomingRefreshToken=req.cookie.refreshToken || req.body.refreshToken

  if(incomingRefreshToken){
    throw new Apierror(401,"Unauthorised request") 
  }
try {
  const decodedToken = jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET
  )
  
  
  const user=await User.findById(decodedToken?._id)
  if(!user){
    throw new Apierror(401,"Invalid refresh token") 
  }
  if(incomingRefreshToken!== user?.refreshToken){
    throw new Apierror(401," refresh token is expired or used")
  }
  
  const options={
    httpOnly:true,
    secure:true
  } 
  const {accessToken,newRefreshToken}=await generateAccessAndRefereshTokens(user._id)
  
  return res
  .status(200)
  .cookie("accessToken",accessToken,options)
  .cookie("refreshToken",newRefreshToken,options)
  .json(
    new ApiResponse(
      200,
      {accessToken,refreshToken:newRefreshToken},
      "Access token refreshed "
    )
  )
} catch (error) {
  throw new Apierror(401,error?.message ||"Invalid refresh token")
}

})

export { registerUser, loginUser,logoutUser,refreshAccessToken};