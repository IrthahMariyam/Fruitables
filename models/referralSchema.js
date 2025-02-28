const mongoose=require('mongoose')
const User = require('./userSchema')
const {Schema}=mongoose
const referralSchema=new Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,ref:"User",required:true,
    },
    referredUser:{
        type:mongoose.Schema.Types.ObjectId,ref:"User",
    },
    referralCode:{
        type:String,
    },
    totalAmount:{
    type:Number,
    },
   
}, {timestamps:true},)