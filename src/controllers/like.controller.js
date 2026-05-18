import mongoose from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

//TODO: toggle like on video
const toggleVideoLike = asyncHandler(async (req, res) => {
  //get videoId
  const { videoId } = req.params;

  //validate

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid videoId.");
  }

  //checking if like already exists or not
  const existingLike = await Like.findOne({ likedBy: userId, video: videoId });
  if (existingLike) {
    await Like.deleteOne({ _id: existingLike._id });
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Video Unliked Successfully."));
  } else {
    await Like.create({ likebBy: userId, video: videoId });
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Video Liked Successfully."));
  }
});

//TODO: toggle like on comment

const toggleCommentLike = asyncHandler(async (req, res) => {
  //get commentId
  const { commentId } = req.params;

  //validate

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid commentId.");
  }

  //checking if like already exists or not
  const existingLike = await Like.findOne({
    likedBy: userId,
    comment: commentId,
  });
  if (existingLike) {
    await Like.deleteOne({ _id: existingLike._id });
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Comment Unliked Successfully."));
  } else {
    await Like.create({ likebBy: userId, comment: commentId });
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Comment Liked Successfully."));
  }
});

//TODO: toggle like on tweet

const toggleTweetLike = asyncHandler(async (req, res) => {
  //get tweetId
  const { tweetId } = req.params;

  //validate

  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid tweetId.");
  }

  //checking if like already exists or not
  const existingLike = await Like.findOne({ likedBy: userId, tweet: tweetId });
  if (existingLike) {
    await Like.deleteOne({ _id: existingLike._id });
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Tweet Unliked Successfully."));
  } else {
    await Like.create({ likebBy: userId, tweet: tweetId });
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Tweet Liked Successfully."));
  }
});

//TODO: get all liked videos

const getLikedVideos = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const page = parseInt(req.query.page) || 1;
  const lilmit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const videosLiked = await Like.aggregate([
    {
      $match: { likedBy: userId, video: { $ne: null } },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "likedVideos",
      },
    },
    {
      $unwind: "$likedVideos",
    },
    {
      $skip: skip,
    },
    {
      $limit: limit,
    },
    {
      $project: {
        id: 0,
        videoFile: "$likedVideos.videoFile",
        thumbnail: "$likedVideos.thumbnail",
        owner: "$likedVideos.owner",
        title: "$likedVideos.title",
        duration: "$likedVideos.duration ",
      },
    },
  ]);

  const totalVideosLiked = await Like.countDocuments({likedBy: userId, video:{$ne: null}})


  return res 
  .status(200)
  .json(
    new ApiResponse(
        200, {
            videosLiked,
            totalVideosLiked
        },"Videos Liked by User fetched Successfully."
    )
  )
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
