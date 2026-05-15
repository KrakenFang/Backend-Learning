import mongoose, { mongo, Schema }  from "mongoose";

const subscriptionSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId,
        // user with subscription 
        ref: "User"
    },
    channel: {
        type: Schema.Types.ObjectId,
        // channel the user is subscribing to  
        ref: "User"
    },
},
{
    timestamps: true 
})



export const User = mongoose.model("User", userSchema)


export const Subscription = mongoose.model("Subscription", subscriptionSchema)