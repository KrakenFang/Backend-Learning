import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { application } from "express";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    console.log(error);
    
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token."
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //get user details fron frontend ,        done
  //validation - not empty,           done
  //check if user already exists , email check ,  done
  // check for images or avatar ,     done
  //if then upload to cloudinary ,     done
  //create user object - create entry in db    , done
  //remove pass n refresh token field from response    ,     done
  //check for user creation
  //return response , if not then send error

  const { fullName, email, username, password } = req.body;
  ///console.log("fullName: ", fullName);
  //// console.log("email: ", email);

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required.");
  }

  const userExists = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (userExists) {
    throw new ApiError(409, "User with email or username already exists.");
  }

  // console.log(req.files);

  const avatarLocalPath = req.files?.avatar?.[0]?.path;

  // its diff from teaching, so this also works
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  // let coverImageLocalPath ;
  // if (req.files && Array.isArray(req.files.coverImage)&& req.files.coverImage.length > 0){
  //     coverImageLocalPath = req.files.coverImage[0].path;
  // }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required.");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  // if(fullName=== ""){
  //     throw new ApiError(400, "Full Name is required!")
  // }

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required.");
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
    throw new ApiError(500, "Something went wrong!!");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered Succesfull."));
});
// ********to revise ***********
//get user details fron frontend ,        done
//validation - not empty,           done
//check if user already exists , email check ,  done
// check for images or avatar ,     done
//if then upload to cloudinary ,     done
//create user object - create entry in db    , done
//remove pass n refresh token field from response    ,     done
//check for user creation
//return response , if not then send error
const loginUser = asyncHandler(async (req, res) => {
  // req body ->  data
  //username or email
  // find the user
  //if user then check password
  // access and refresh token
  // send through cookies

  const { username, email, password } = req.body;

  if (!username && !email) {
    throw new ApiError(400, "Either Username or Email is required.");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User doesn't exist.");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(404, "Password is incorrect.");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedUser,
          accessToken,
          refreshToken,
        },
        "User logged in Successfully."
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .cookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out."));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized Request.");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token.");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token is Expired or Used.");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "Access token refreshed."
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Refresh Token.");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confPassword } = req.body;

  if (!(newPassword === confPassword)) {
    throw new ApiError(400, "Password doesn't match.");
  }

  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old Password.");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed Successfully."));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(
      new ApiResponse(200, {},"Current User fetched Successfully.")
    );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required.");
  }

  const user = await User.findByIdAndUpdate(req.user?._id, {
    $set: {
      fullName: fullName,
      // you can use just "fullName,"
      email: email 
    }
  }, {new: true}).select("-password")

  return res
  .status(200)
  .json(new ApiResponse(200, user, "Account details updated successfully."))
});

const updateUserAvatar = asyncHandler(async(req, res) => {
  const avatarLocalPath = req.file?.path

  if(!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing.")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)
  if(!avatar.url) {
    throw new ApiError(400,"Error while uploading avatar.")
  }

  const user = await User.findByIdAndUpdate(
    req,user?._id,
    {
      $set:{
        avatar: avatar.url
      }
    },

    {new : true}
  ).select("-password")

  return res
  .status(200)
  .json(
    new ApiResponse(200, user, "Avatar updated Successfully.")
  )
})


const updateUserCoverImage = asyncHandler(async(req, res) => {
  const coverImageLocalPath = req.file?.path

  if(!coverImageLocalPath) {
    throw new ApiError(400, "Cover Image file is missing.")
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath)
  if(!coverImage.url) {
    throw new ApiError(400,"Error while uploading Cover Image.")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        coverImage: coverImage.url
      }
    },

    {new : true}
  ).select("-password")

  return res
  .status(200)
  .json(
    new ApiResponse(200, user, "Cover Image updated Successfully.")
  )
})

const getUserChannelProfile = asyncHandler(async( req,res) =>{
   const {username} =  req.params 

   if(!username?.trim()) {
    throw new ApiError(400, "username is missing.")
   }
   const channel =  await User.aggregate([
    {
      $match: {
        username:  username?.toLowerCase()
      }
    },
    { // to look for no of subscriber 
      $lookup:{
        from : "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as:"subscribers"
      }
    },
    { // to look to whom one has subscribed to
      $lookup:{
        from : "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as:"subscribedTo"
            }
    },
    {
      $addFields:{
        subscribersCount: {
          $size: "$subscribers"
        },
        channelSubscribedToCount: {
          $size: "$subscribedTo"
        },
        isSubscribed:{
          $cond:{
            if:{$in: [req.user?._id, "$subscribers.subscriber"]},
            then: true,
            else: false 
          }
        }
      }
    },
    {
      $project:{
        fullName: 1,
        username: 1, 
        subscribersCount: 1,
        channelSubscribedToCount: 1,
        isSubscribed:1,
        avatar: 1, 
        coverImage: 1, 
        email : 1

      }
    }
   ])
   
   if(!channel?.length){
    throw new ApiError(404, "Channel doesn't exist.")
   }

   return res
   .status(200)
   .json(
    new ApiResponse(200, channel[0], "User channel fetched successfully."
    )
   )
})

const getWatchHistory  = asyncHandler(async( req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id)
      }
    },{
      $lookup:{
        from : "videos",
        localField:"watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from:"users",
              localField:"owner",
              foreignField: "_id",
              as:"owner",
              pipeline:[
                {
                  $project: {
                    fullName:1,
                    username:1,
                    avatar:1
                  }
                }
              ]
            }
          },
          {
            $addFields:{
              owner: {
                $first:  "$owner"
              }
            }
          }
        ]
      }
    }
  ])

  return res
  .status(200)
  .json(
     new ApiResponse(200,
      user[0].WatchHistory,
      "Watch History fetched successfully."
     )
  )


})

export { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory };
