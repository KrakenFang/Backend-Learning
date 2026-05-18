import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  //TODO : get all videos based on query , sort, pagination

  //parse query parameters
  const {
    page = 1,
    limit = 10,
    query,
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query;

  //filter

  const match = {};
  if (query) {
    match.$or = [
      {
        title: { $regex: query, $options: "i" },
        description: { $regex: query, $options: "i" },
      },
    ];
  }
  if (!isValidObjectId(userId)) {
    match.owner = userId;
  }

  //sorting
  const sort = {};
  if (sortBy) {
    sort[sortBy] = sortType === "asc" ? 1 : -1;
  }

  //pagination

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const lim = parseInt(limit);

  //agg pipeline

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    { $unwind: "$owner" },
    {
      $project: {
        title: 1,
        description: 1,
        duration: 1,
        videoFile: 1,
        thumbnail: 1,
        createdAt: 1,
        isPublished: 1,
        "owner._id": 1,
        "owner.fullName": 1,
      },
    },
    { $sort: sort },
    { $skip: skip },
    { $limit: lim },
  ];
  // to get pagination videos
  const videos = await Video.aggregate(pipeline);

  // to get total count for pagination
  const totalVideos = await Video.countDocuments(match);

  // return videos n page info

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        videos,
        page: parseInt(page),
        limit: lim,
        totalPages: Math.ceil(totalVideos / lim),
        totalResults: totalVideos,
      },
      "Videos fetched Successfully."
    )
  );
});

// TODO: get video, upload to cloudinary, create video

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  // get input from user
  const { title, description, duration } = req.body;
  //validate

  if ([title, description, duration].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All Fields are required.");
  }

  // video file
  const videoLocalPath = req.files?.videoFile[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

  //validate or check for it

  if (!videoLocalPath) {
    throw new ApiError(400, "Video file is required.");
  }

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnailis required");
  }

  // uploading file to cloudinary

  const videoFile  = await uploadOnCloudinary(videoLocalPath)
  const thumbnailFile = await uploadOnCloudinary(thumbnailLocalPath);

  //check if error uploading 

  if(!videoFile.url){
    throw new ApiError(400,"Error while uploading video.")
  }
  if(!thumbnailFile.url) {
    throw new ApiError(400,"Error while uploading thumbnail.")
  }

  // video object id in DB
  const video = await Video.create({
    title,
    description,
    duration : Number(duration),
    videoFile:  videoFile.url,
    thumbnailFile:  thumbnailFile.url,
    owner:  req.user._id

  })

  //returning response 
  return res
  .status(201)
  .json(
    new ApiResponse(
        200,
        video,
        "Video uploaded Successfully."
    )
  )
});

    //TODO: get video by id

const getVideoById = asyncHandler(async (req, res) => {

      //get video id 
    const { videoId } = req.params

    //check if u got videoid 

    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400,"Invalid videoId.")
    }

    //check videoId by video 
    const video = await Video.findById(videoId).populate('owner', 'fullName')

    //check if id exists or not 
    if(!video){
        throw new ApiError(400,"Video not found.")
    }

  //retunr video response 

  return res
  .status(200)
  .json(
    new ApiResponse(
        200, video, "Video fetched Successfully."
    )
  )
})

//TODO: update video details like title, description, thumbnail

const updateVideo = asyncHandler(async (req, res) => {

    // validate videoId

    const { videoId } = req.params
    
    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400, "Invalid VideoId.")

    }

    // searching the video 
    const video = await video.findById(videoId);
    if(!video){
        throw new ApiError(400,"Video not found.")
    }

    // check ownership of video 
    if(video.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403, "Unauthorized")
    }

    //fetch update fields from video body 
    //ie title description 
    const{ title, description} = req.body

    //for new thumbnail uploaded
    let thumbnailUrl = video.thumbnail;
    if(req.file){
        const updatedThumbnail = await uploadOnCloudinary(req.file.path)
        if(!updatedThumbnail?.url){
            throw new ApiError(400,"Error while uploading thumbnaiil.")
        }
        thumbnailUrl= updatedThumbnail.url;
    }

    // updating update fields
    if(title) { 
        video.title= title
    }
    if(description ){
        video.description= description
    }
    if(thumbnailUrl) {
        video.thumbnail= thumbnailUrl;
    }

    //saving updated fields into that video 
    await video.save()

    // return video with updated fields

    return res
    .status(200)
    .json(200,
        new ApiResponse(200,video,"Video Updated Successfully.")
    )
})

 //TODO: delete video

    const deleteVideo = asyncHandler(async (req, res) => {

        // get videoId
    const { videoId } = req.params
   
    // validate videoId
    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400, "Invalid VideoId.")
    }

    //match id in DB
     const video = await Video.findById(videoId)
     if(!video){
        throw new ApiError(400,"Video not found.")
     }

     //check ownership of video 
     if(video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized")
     }

    //  //data cloudinary delete
    //  await cloudinary.uploader.destroy(video.videoFilePublicId,{
    //     resource_type: "video"
    //  })
    //  await cloudinary.uploader.destroy(video.thumbnailPublicId)

     // delete video in database
     await Video.deleteOne({_id:  videoId})

     //or await Video.findByIdAndDelete(videoId)

     //return output data 
     return res
     .status(200)
     .json(
        new ApiResponse (200, {}, "Video deleted Successfully.")
     )
})

// TODO: toogling publish status

const togglePublishStatus = asyncHandler(async (req, res) => {
    // get videoId
    const { videoId } = req.params
    //validate 
    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400, "Invalid videoId.")
    }

    //match id in DB
    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(400,"Video not found.")
    }

    //check ownership

    if(video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized")
}

    //toggling isPublish status
     video.isPublished = !video.isPublished;

     // saving the change
      await video.save()

      //return after changes 

      return res
      .status(200)
      .json(
        new ApiResponse(200, video , "Publish Status toggled Successfully.")
      )

})




export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
