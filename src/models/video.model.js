import mongoose,{Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
    {
        videoFile: {
            type :String , //cloudinary url 
            reuqired:  true 
        },
        thumbnail: {
            type :String , //cloudinary url 
            reuqired:  true 
        },
        title: {
            type :String , //cloudinary url 
            reuqired:  true 
        },
        description: {
            type :String , //cloudinary url 
            reuqired:  true 
        },
        duration : {
            type :Number  , //cloudinary url 
            reuqired:  true 
        },
        views : {
            type :Number  , //cloudinary url 
            default: 0
        },
        ispublished  : {
            type :Boolean  , //cloudinary url 
            default :  true 
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref:  'User'
        }
    }
,{
    timestamps: true 
})

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("Video",  videoSchema)