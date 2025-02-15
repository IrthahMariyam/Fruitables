const mongoose=require('mongoose')
const {Schema}=mongoose;
const userSchema=new Schema({
    name:{
        type :String,
        required:true

    },
    email:{
        type:String,
        unique:true,
        required:true,
    },
    phone:{
        type:String,
        required:false,
        unique:false,
        sparse:true,
        default:null
    },
    googleId:{
        type:String,
        required:false,
        default:null

    },
    password:{
        type:String,
        required:false,

    },
    isBlocked:{
         type:Boolean,
         default:false
    },
  
    isAdmin:{
        type:Boolean,
        default:false,
    },
    
    wallet:{
        type:Number,
        default:0,
    },
    whishlist:[{
        type:Schema.Types.ObjectId,
        ref:"Whishlist"
    }],
   
    createdOn:{
        type:Date,
        default:Date.now,
    },
   
    searchHistory:[{
    type:Schema.Types.ObjectId,
    ref:"Category"
    }],
    searchOn:{
        type:Date,
        default:Date.now,
    },
    redeemedUser: {
        type: Schema.Types.ObjectId,
        ref: "Coupon",
        default: null
    },

})

const User=mongoose.model("User",userSchema)
module.exports=User;