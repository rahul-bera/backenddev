import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { user } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


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
    }

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

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
    const user = await user.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email, 
        password,
        username: username.toLowerCase()
    })
        const createdUser = await user.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )
});
 



export { 
    registerUser,
 }
