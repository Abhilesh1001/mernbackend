import {asyncHandler} from '../utils/asynchandler.js'
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.model.js'
import {uploadOnClodinry} from '../utils/clodnary.js' 
import {ApiResponse} from '../utils/ApiResponse.js'


const registerUser =  asyncHandler(async (req,res)=>{
    // get user details 
    // vlidation - not empty 
    // check if user already exist : username,email 
    // check for images, check for avatar
    // upload them clodnary, avatar 
    // create user object - create entry in db  
    // remove password and refresh token field froom response 
    //  check for user creation 
    // return response 

    const {username,fullName,email,password} =req.body

    console.log(username,fullName,email,password)
    if ([fullName, email, username, password].some((field) => field.trim() === "")) {
        throw ApiError(400, "All Fields are required");
    }

    const existanceUser = User.findOne({
        $or:[{username},{email}]
    })

    if (existanceUser){
        throw new ApiError(409,"User with email or username already exist")

    }

    const avatarLocalPath = req.files?.avatar[0]?.path; 
    const coverImageLocalPath=req.files?.coverImage[0]?.path
    if(!avatarLocalPath){
        throw new ApiError(400,"Avater file is require")
    }
    
    const avatar = await uploadOnClodinry(avatarLocalPath)
    const coverImage = await uploadOnClodinry(coverImageLocalPath)
    if(!avatar){
        throw new ApiError(400,"Avater file is require")
    }

    const user = await User.create({
        fullName,
        avatar : avatar.url,
        coverImage : coverImage?.url||"",
        username:username.toLowerCase,
        password,
        email,
    })

    const createdUser  = await User.findById(user._user).select("-password -refreshToken")

    if (!createdUser){
        throw new ApiError(500,"Somthing went wron while registering the user")
    }


    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registerd Successfully")
    )






    res.status(200).json({
        message :'ok'
    })
})


export {registerUser}