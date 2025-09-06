import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";


const generateAccessAndRefereshTokens = async(userId)=>{
    try {
        // if we want to generate token first we have to find he user means  1️⃣ Find the user in DB
        const user = await User.findById(userId)

         // 2️⃣ Generate access + refresh tokens using methods on the user model
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()


         // 3️⃣ Save the refresh token in the database for that user
        user.refreshToken = refreshToken
        await user.save({validateBeforeSav: false}) // we write  { validateBeforeSav: false } because you’re only updating one field.

        return {accessToken,refreshToken} 

        // 4️⃣ Handle errors
    } catch (error) {
        throw new ApiError(500, "something went wrong while generating refresh and access token")
    }
}


// const registerUser = asyncHandler(asyncHandler( async (req, res)=>{
//     // get user details from frontend
//     // validation - not empty
//     // check if user already exists: username, email
//     // check for images, check for avatar
//     // upload them to cloudinary, avatar
//     // create user object - create entry in db
//     // remove password and refresh token field from response
//     // check for user creation
//     // return res
// }))



    // const registerUser = asyncHandler(async (req, res) => {
    //     res.status(200).json({
    //         message: "ok"
    //     })
    // })

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, username, password } = req.body;
    console.log("email:", email);

    //Now we have to check the validation 
    if(fullName ===""){
        throw new ApiError(400,"Fullname is required")
    }// we can do check one by one but in the following we can check alltogether in a single condition


    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }// here we check everything in a single condition


    // check if user already exists: username, email-------------------->>>>>>>>>>>>>>
    // so basically we try to do find the user who matches the email or username
    const existedUser = await User.findOne({// basically what basically find one does ?whenever the first user he got, he will return 
        $or: [{ username }, { email }] 
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    console.log("req.files ===>", req.files);

    //Now we handle Images

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    // console.log(avatarLocalPath)


    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }
    //Now we have to upload the image to cloudinary, so we already created the cloudinary.js in utils so we just import it here
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    
    

    if(!avatar){
        throw new ApiError(400, "Avatar file is required")    
    }

    // create user object - create entry in db
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email, 
        password,
        username: username.toLowerCase()
    })
        const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    console.log("req.body: ",req.body);
    

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )
});

// Now we will do login:

const loginUser = asyncHandler(async(req,res)=>{
    // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie

    // step -1: from request body we took data
    const {email,username,password} = req.body

    //now we will check if we have no username or email so we will throw a error

        if (!username && !email) {
        throw new ApiError(400, "username or email is required")
        }


    // if(!username || !email){
    //     throw new ApiError(400, "username or email is required")
    // }
    //if username and email is available to me then we have to find a user so that if you are registered then you can login that means email or usename anyone will be there in the database, so we want to find both
    
    // I want to find either you please find email or username
    //this findOne -> when it found the first element/entry in mongodb it will give that element
    const user = await User.findOne({
        $or:[{username},{email}]
    })
    // so now on the basis of above those parameters you can't find the username or email that means the user is not registered
    if(!user){
        throw new ApiError(404,"user does not exists")
    }

    //Password check
    const isPasswordValid = await user.isPasswordCorrect(password) // this password comes from req.body

    // now if password is not valid then we have to give an error
    if(!user){
        throw new ApiError(401,"Invalid user credentials, Password incorrect")
    }
    // now if the user password is also correct then build access and refresh token
    
    const {accessToken,refreshToken}= await generateAccessAndRefereshTokens(user._id)//so here we got our access token and refresh token

    //Now we have to send it in cookies
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")


    //whenever we send cookies we have to design the options
    const options = {
        httpOnly: true,
        secure: true
    }
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )


})

//Now we will logout the user
const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})

//now we will do refreshAccessToken , so we need an endpoint where user can generate a access token

const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (incomingRefreshToken) {
        throw new ApiError(401,"unautorized request");
        
    }

    try{
    // now it is the time to verify
    const decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
    )
    //so after verified we got decoded token
    //now we have to find an id from the database which just decoded ,now we will put a query in mongodb and get the user
    const user = await User.findById(decodedToken?._id)

    if (!user) {
        throw new ApiError(401,"Invalid REFRESH TOKEN");
        
    }

    if (incomingRefreshToken !== user?.refreshToken) {
        throw new ApiError(401, "Refresh token is expired or used")
            
    }

    //if both tokens are same we generate tokens
            const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }



})

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}
