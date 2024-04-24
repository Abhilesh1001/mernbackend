import {asyncHandler} from '../utils/asynchandler.js'
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.model.js'
import {uploadOnClodinry} from '../utils/clodnary.js' 
import {ApiResponse} from '../utils/ApiResponse.js'
import jwt from 'jsonwebtoken'




const generateAccessAndRefreshToken = async (userId)=>{
    try{
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken =user.generateRefreshToken()
        user.refreshToken = refreshToken 
        await user.save({validateBeforeSave:false})

        return {accessToken,refreshToken}

    }catch(errro){
        throw new ApiError(500,'Somthing went wrong while generatoing access refresh token')
    } 
}




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

    const existanceUser =await User.findOne({
        $or:[{username},{email}]
    })

    if (existanceUser){
        throw new ApiError(409,"User with email or username already exist")

    }

    const avatarLocalPath = req.files?.avatar[0]?.path; 
    const coverImageLocalPath=req.files?.coverImage[0]?.path


    if(!coverImageLocalPath){
        throw new ApiError(400,"Cover file is require")

    }
    
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
        avatar : avatar.url||"",
        coverImage : coverImage?.url||"",
        username:username,
        password:password,
        email,
    })

    const createdUser  = await User.findById(user._id).select("-password -refreshToken")

    if (!createdUser){
        throw new ApiError(500,"Somthing went wron while registering the user")
    }


    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registerd Successfully")
    )

})


const loginUser = asyncHandler(async (req, res) => {
    //req body
    //username or email 
    //find the user 
    //password check
    // access and refresh token generate 
    // send secure cookies

    const { email, username, password } = req.body;
    if (!username && !password) {
        throw new ApiError(400, "Username or Password required");
    }
    const user = await User.findOne({
        $or: [{ email }, { username }]
    });
    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    console.log(password, isPasswordValid);
    if (!isPasswordValid) {
        throw new ApiError(404, "Invalid User Credentials");
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    };

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, 'User Logged in'));
});


const logoutUser =  asyncHandler(async (req,res)=>{
    // User.findByI
    await User.findByIdAndUpdate(req.user._id,{
        $set:{
            refreshToken : undefined
        }
    },
    {
        new : true 
    }

)

const option ={
    httpOnly:true,
    secure : true
}

    return res 
    .status(200)
    .clearCookie("accessToken",option)
    .clearCookie("refreshToken",option)
    .json(new ApiResponse(200,{},"User logged Out"))

    
})



const refreshAccessToken = asyncHandler(async (req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || res.body.refreshToken
    if (!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized request")
    }
try {
    
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user =await User.findById(decodedToken?._id)
        if (!user){
            throw new ApiError(401,"Invalid Refresh Token")
        }
    
        if (incomingRefreshToken!== user?.refreshToken){
            throw new ApiError(401,'Refresh Token is expired or used')
        }
    
        const options ={
            httpOnly: true,
            secure: true 
        }
        const {accessToken,newrefreshToken} =await generateAccessAndRefreshToken(user._id)
    
        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newrefreshToken, options)
            .json(new ApiResponse(200,{accessToken,refreshToken : newrefreshToken},"Access token refreshed"))
} catch (error) {
    throw new ApiError(401,error?.message || "Invalid refresh Token")
}
})


export {registerUser,loginUser,logoutUser,refreshAccessToken}