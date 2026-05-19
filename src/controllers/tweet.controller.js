import mongoose from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

//TODO: create tweet

const createTweet = asyncHandler(async (req, res) => {
  //get tweet content
  const { content } = req.body;

  //check content
  if (!content || content.trim() == "") {
    throw new ApiError(400, "Content cannot be empty.");
  }

  //create tweet
  const tweet = await Tweet.create({
    content,
    owner: req.user._id,
  });

  //return response

  return res
    .status(201)
    .json(new ApiResponse(201, tweet, "tweet created Successfully."));
});

// TODO: get user tweets
const getUserTweets = asyncHandler(async (req, res) => {
  //get tweets
  const { userId } = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  //validate
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid userId.");
  }

  // get tweets list
  const tweets = await Tweet.find({ owner: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  //get total tweets
  const totalTweets = await Tweet.countDocuments({ owner: userId });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        tweets,
        limit,
        page,
        totalPages: Math.ceil(totalTweets / limit),
        totalResults: totalTweets,
      },
      "Tweet by User fetched Successfully."
    )
  );
});

//TODO: update tweet

const updateTweet = asyncHandler(async (req, res) => {
  //get tweetId
  const { tweetId } = req.params;

  //validate
  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid tweetId.");
  }

  //get tweet
  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Tweet not found.");
  }

  if (tweet.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to update this tweet");
  }

  const { content } = req.body;
  if (content !== undefined) {
    if (content.trim() === "") {
      throw new ApiError(400, "Content cannot be empty.");
    }
    tweet.content = content;
  }

  await tweet.save();

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet updated Successfully."));
});

//TODO: delete tweet

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  //validate
  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid tweetId");
  }

  const tweet = await Tweet.findById(tweetId)

  if (!tweet) {
    throw new ApiError(404, "Tweet not found.");
  }


  if (tweet.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to delete this tweet");
  }

await Tweet.findOneAndDelete(
 tweetId);
  
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Tweet deleted Successfully."));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
