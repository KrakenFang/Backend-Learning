import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Comment } from "../models/comment.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import { Video } from "../models/video.model.js";

//TODO: get all comments for a video

const getVideoComments = asyncHandler(async (req, res) => {
  //get videoId
  const { videoId } = req.params;

  //validate
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid VideoId.");
  }

  // pagination  and default
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  //convert videoid string into real mongoDb objectId
  const videoObjectId = mongoose.Types.ObjectId(videoId);

  //get comment owner details
  const comments = await Comment.aggregate([
    {
      // matching comments belonging to this video
      $match: { video: videoObjectId },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
      },
    },
    {
      // owner details array into object
      $unwind: "$ownerDetails",
    },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $project: {
        _id: 1,
        content: 1,
        createdAt: 1,
        owner: {
          _id: "$ownerDetails._id",
          username: "$ownerDetails.username",
          avatar: "$ownerDetails.avatar",
          fullName: "$ownerDetails.fullName",
        },
      },
    },
  ]);

  //get total comments count from video with comment id
  const totalComments = await Comment.countDocuments({ video: videoObjectId });

  //return comment details

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        comments,
        totalComments,
        page,
        limit,
        totalPages: Math.ceil(totalComments / limit),
      },
      "Total comments for video fetched Successfully."
    )
  );
});

// TODO: add a comment to a vide

const addComment = asyncHandler(async (req, res) => {
  //get video id
  const { videoId } = req.params;

  //get content
  const { content } = req.body;

  //validate

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  //check if comment is empty
  if (!content || content.trim() === "") {
    throw new ApiError(400, "Comment cannot be empty.");
  }

  //
  const videoExists = await Video.exists({ _id: videoId });
  if (!videoExists) {
    throw new ApiError(404, "Video not found.");
  }

  const comment = await Comment.create({
    content,
    owner: req.user._id,
    video: videoId,
  });

  return res.status(200).json(
    new ApiResponse(
      201,
      {
        _id: comment._id,
        content: comment.content,
        video: comment.video,
        createdAt: comment.createdAt,
      },
      "Comment created Successfully."
    )
  );
});
    
// TODO: update a comment
const updateComment = asyncHandler(async (req, res) => {
  //get comment and its conttent
  const { commentId } = req.params;
  const { content } = req.body;

  // validate

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid commentId.");
  }

  if (!content || content.trim() === "") {
    throw new ApiError(400, "Content cannot be empty.");
  }

  //find comment by id

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(404, "Comment not found.");
  }

  //check comment ownership
  if (comment.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized.");
  }

  //updating content
  comment.content = content;

  //saving the revised comment
  await comment.save();

  //returning the revised response

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment updated Successfully."));
});

// TODO: delete a comment
const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  //validate
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid commentId.");
  }

  //finding comment
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found.");
  }

  //checking ownership

  if (comment.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized.");
  }

  //deleting comment
  await Comment.findByIdAndDelete(commentId);

  //returning response

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted Successfully."));
});

export { getVideoComments, addComment, updateComment, deleteComment };
