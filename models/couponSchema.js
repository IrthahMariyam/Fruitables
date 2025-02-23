
const mongoose = require("mongoose");
const {Schema}=mongoose
const couponSchema = new mongoose.Schema({
  couponCode: {
    type: String,
    required: true,
    trim: true,
  },
  startDate: {
    type: Date,
    required: true,
   
  },
  endDate: {
    type: Date,
    required: true,
    
  },
  minPrice: {
    type: Number,
    required: true,
    min: [0, "Minimum price must be positive."],
  },
  usageLimit: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    required: true,
    min: [1, "Discount must be at least 1%."],
    max: [150, "Discount cannot exceed 100%."],
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  userUsage: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", 
        
      },
      usageCount: {
        type: Number,
        default: 0,
      },
    },
  ],
  active:{
    type:Boolean,
    default:true
}
},{timestamps:true})

module.exports = mongoose.model("Coupon", couponSchema);
