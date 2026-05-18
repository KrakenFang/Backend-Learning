import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// TODO: toggle subscription
const toggleSubscription = asyncHandler(async (req, res) => {
  //get channelId
  const { channelId } = req.params;

  //get userId

  const userId = req.user._id;

  //validate
  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(400, "Invalid channelId.");
  }

  //checking channel exists or not 

    const channelExists = await User.exists({
    _id: channelId,
  });

  if (!channelExists) {
    throw new ApiError(404, "Channel not found");
  }

  //preventing self subscribing
  if (channelId === userId.toString()) {
    throw new ApiError(400, "Cannot subscribe to your own channel.");
  }



  //checking if already subscribed or not
  const existing = await Subscription.findOne({
    subscriber: userId,
    channel: channelId,
  });

  if (existing) {
    await Subscription.deleteOne({ _id: existing._id });
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Successfully Unsubscribed."));
  } else {
    await Subscription.create({ _id: userId, channel: channelId });
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Successfully Subscribed."));
  }
});

// TODO: controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  // get channelId
  const { channelId } = req.params;

  //validate
  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(400, "Invalid channelId.");
  }

  //subscriber count

  const subscribers = await Subscription.aggregate([
    {
      $match: { channel: mongoose.Types.ObjectId(channelId) },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriberDetails",
      },
    },
    {
      $unwind: "$subscriberDetails",
    },
    {
      $project: {
        _id: 0,
        subscriberId: "$subscriberDetails._id",
        fullName: "subscriberDetails.fullName",
        email: "$subscriberDetails.email",
      },
    },
  ]);

  //count
  const totalSubscribers = await Subscription.countDocuments({ channel: channelId})

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalSubscribers,
        subscribers,
      },
      "Subscribers fetched Successfully."
    )
  );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    // get subscriberId
  const { subscriberId } = req.params;

  //validate
  if(!mongoose.Types.ObjectId.isValid(subscriberId)){
    throw new ApiError(400,"Invalid subscriberId.")
  }

  const subscribedChannel = await Subscription.aggregate([
    {
        $match: {subscriber: mongoose.Types.ObjectId(subscriberId)}
    },{
        $lookup:{
            from:'users',
            localField:'channel',
            foreignField:'_id',
            as:'channelDetails'
        }
    },{
        $unwind: "$channelDetails"
    },{
        $project:{
            _id:0,
            fullName: '$channelDetails.fullName',
            channelId: '$channelDetails._id',
            email: '$channelDetails.email'
        }
    }
  ])

  //total channels subscribed count 

  const totalSubscribedChannel = await Subscription.countDocuments({subscriber: subscriberId})

  //returning response 

  return res
  .status(200)
  .json(
    new ApiResponse(
        200,{
            totalSubscribedChannel, 
            subscribedChannel
        },"Details of channel subscribed fetched Successfully."
    )
  )
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
