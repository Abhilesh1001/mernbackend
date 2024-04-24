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

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword} = req.body
    const user= await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid old Password")
    }
    user.password = newPassword
    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password Change succefully"))

})



const gerCurrentUser = asyncHandler(async(req,res)=>{
    return(200)
    .status(200)
    .json(200,req.user,"Current userfetch Successfully")
})


const updateAccountDetails =  asyncHandler(async(req,res)=>{
    const {fullName,email} = req.body
    if(!fullName || !email){
        throw new ApiError(400,"All field are required")
    }
    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,
                email :email
            }
        },
        {new : true}
    
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Account Details updated successfully"))
})



const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is Missing")

    }

    const avatar =  await uploadOnClodinry(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400,"Error while uploading on Avatar")
    }

    const user =await User.findById(req.user?._id,
    {
        $set : {
            avatar : avatar.url 
        }

    }
    ,
{new : true}).select('-password')



return res.status(200)
.json(
    new ApiResponse(200,user,"Avatar Image updated successfully")
)



})



const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.file?.path
    if(!coverImageLocalPath){
        throw new ApiError(400,"CoverImage file is Missing")

    }

    const coverImage =  await uploadOnClodinry(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading on Cover Image")
    }

    const user = await User.findById(req.user?._id,
    {
        $set : {
            coverImage : coverImage.url 
        }

    }
    ,
{new : true}).select('-password')

return res.status(200)
.json(
    new ApiResponse(200,user,"Cover Image updated successfully")
)


})



const getUserChannelProfile = asyncHandler(async (req,res)=>{
    const  {username} = req.params

    if(!username?.trim){
        throw new ApiError(400,"username is missing")
    }

    const channel = await User.aggregate([
        {
            $match:{
                username :username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from :"subscriptions",
                localField : "_id",
                foreignField : "channel",
                as :"subscribers"
            }
        },
        {
            $lookup:{
                from :"subscriptions",
                localField : "_id",
                foreignField : "subscriber",
                as :"subscribedTo"
            } 
        },
        {
            $addFields:{
                subcriberCount :{
                    $size : "$subscribers"
                },
                channelSubscribedToCount :{
                    $size :"$subscribedTo"
                },
                isSubscribed :{
                    $cond :{
                        if :{$in: [req.user?._id,"$subscribers.subscriber"]},
                        then : true,
                        else : false
                    }
                }
            }
        },
        {
            $project:{
                fullName : 1,
                username : 1,
                subcriberCount:1,
                channelSubscribedToCount:1,
                isSubscribed:1,
                avatar : 1,
                coverImage : 1,
                email:1
            }

        }
    ])

    if (!channel?.length){
        throw new ApiError(404,"channel does not exits")
    }


    return res
    .status(200)
    .json(
        new ApiResponse(200,channel[0],'User channel fetch successfully')
    )

})


export {registerUser,loginUser,logoutUser,refreshAccessToken,changeCurrentPassword,gerCurrentUser,updateAccountDetails,updateUserAvatar,updateUserCoverImage,getUserChannelProfile}