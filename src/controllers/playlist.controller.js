import mongoose, { isValidObjectId, mongo } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

//TODO: create playlist
const createPlaylist = asyncHandler(async (req, res) => {
  // get name
  const { name, description } = req.body;
  // validate input
  if (!name || name.trim() === "") {
    throw new ApiError(400, "Playlist name is required.");
  }

  //create playlist
  const playlist = await Playlist.create({
    name,
    description,
    owner: req.user._id,
    videos: [],
  });

  return res
    .status(201)
    .json(new ApiResponse(201, playlist, "Playlist created Successfully."));
});

//TODO: get user playlists

const getUserPlaylists = asyncHandler(async (req, res) => {
  // get user
  const { userId } = req.params;

  //validate
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid userId.");
  }

  //check if user is the owner themselves

  if (req.user._id.toString() !== userId) {
    throw new ApiError(403, "Authenticated But Forbidden.");
  }

  //pagination

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  //finding playlist by userId

  const playlists = await Playlist.find({
    owner: userId,
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalPlaylists = await Playlist.countDocuments({ owner: userId });

  //returning playlist

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        playlists,
        limit,
        page,
        totalPages: Math.ceil(totalPlaylists / limit),
        totalResults: totalPlaylists,
      },
      "Playlists fetched Successfully."
    )
  );
});

//TODO: get playlist by id

const getPlaylistById = asyncHandler(async (req, res) => {
  //geet

  const { playlistId } = req.params;

  //validate
  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "Invalid playlistId.");
  }

  // get playlist
  const playlist = await Playlist.findById(playlistId).populate("videos");

  if (!playlist) {
    throw new ApiError(404, "Playlist not found.");
  }

  //check ownership (if visibility is private)

  if (playlist.owner.toString() !== req.user._id.toString())
    //returning response

    return res
      .status(200)
      .json(new ApiResponse(200, playlist, "Playlist fetched Successfully."));
});

//TODO:  add video to playlist

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  //get playlistId and the videoId to add
  const { playlistId, videoId } = req.params;

  //validate

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "Invalid playlistId");
  }

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  // get playlist
  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(400, "Playlist not found.");
  }

  //checking for ownership authorization

  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "Authenticated But Forbidden: You cannot edit others playlist."
    );
  }

  const videoExists = await Video.exists({ _id: videoId });

  if (!videoExists) {
    throw new ApiError(404, "Video not found");
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    { _id: playlistId, owner: user._id },
    {
      $addToSet: { videos: videoId },
    },
    { new: true }
  ).populate("videos");

  //returning updated playlist

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedPlaylist, "Playlist updated Successfully.")
    );
});

// TODO: remove video from playlist
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  // get playlistId and videoId
  const { playlistId, videoId } = req.params;

  //validate

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "Invalid playlistId");
  }

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  // get playlist
  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(400, "Playlist not found.");
  }

  //checking for ownership authorization

  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "Authenticated But Forbidden: You cannot edit others playlist."
    );
  }

  const videoExists = await Video.exists({ _id: videoId });

  if (!videoExists) {
    throw new ApiError(404, "Video not found");
  }

  const updatedPlaylist = await Playlist.findByIdAndDelete(
    { _id: playlistId, owner: user._id },
    {
      $pull: { videos: videoId },
    },
    { new: true }
  ).populate("videos");

  //returning updated playlist

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylist,
        "Video from the playlist deleted Successfully."
      )
    );
});

// TODO: delete playlist

const deletePlaylist = asyncHandler(async (req, res) => {
  //get playlistId
  const { playlistId } = req.params;

  //validate

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "Invalid playlistId.");
  }

  //get playlist

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found.");
  }

  //checking ownership

  if (playlist.owner.toString !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "Authenticated But Forbidden: Only owner can edit this playlist."
    );
  }

  // deletion
  await Playlist.findByIdAndDelete(playlistId);

  //returning response

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Playlist deleted Successfully."));
});

//TODO: update playlist

const updatePlaylist = asyncHandler(async (req, res) => {
  // get playlistId
  const { playlistId } = req.params;
  const { name, description } = req.body;

  //validate 
  if(!mongoose.Types.ObjectId.isValid(playlistId)){
    throw new ApiError(400,"Invalid playlistId.")
  }

  //get playlist
  const playlist = await Playlist.findById(playlistId)
  if(!playlist){
    throw new ApiError(400,"Playlist not found.")
  }

  //checking ownership of playlist 

  if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Forbidden: Only owner can edit this playlist")
    }

    if(name !== undefined){
        if(name.trim() !== ""){
            throw new ApiError(404,"Name cannot be empty.")
        }
        updatedPlaylist.name = name;
    }
    if(description !== undefined){
        if(description.trim() !== ""){
            throw new ApiError(404,"Description cannot be empty.")
        }
        updatedPlaylist.description = description;
    }

    //saving thee updated playlist 
    await updatePlaylist.save();

    //returning playlist with changes 

    return res
    .status(200)
    .json(
        new ApiResponse(
            200, updatedPlaylist, "Playlist updated Successfully."
        )
    )

});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
