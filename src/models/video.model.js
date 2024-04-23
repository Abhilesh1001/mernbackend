import mongoose,{Schema} from "mongoose";
import mongooseAggreatePaginate from 'mongoose-aggregate-paginate-v2'

const videoSchema =  new Schema({
    
        videoFIle : {
            type : String,
            required: true
        },
        thumbnail : {
            type : String,
            required : true,
        },
        description :{
            type : String ,
            required : true
        },
        time :{
            type : String ,
            required : true
        },
       duration :{
            type : Number,
            required : true
        },
        views :{
            type : Number,
            default : 0
        },
        isPublished : {
            type :Boolean,
            deafult : true
        },
        owner : {
            type : mongoose.Schema.Types.ObjectId,
            ref : 'User'
        } 
},{timestamps:true})


videoSchema.plugin(mongooseAggreatePaginate)

export const Video = mongoose.model('Video',videoSchema)