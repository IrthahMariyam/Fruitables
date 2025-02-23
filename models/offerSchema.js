const mongoose = require('mongoose');
const {Schema}=mongoose;

const offerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    isActive:{
        type:Boolean,
        default:true
    },
    discount: {
        type: Number,
        required: true,
        min: 0, 
    },
    applicableType: {
        type: String,
        enum: ['category', 'product'], 
        required: true,
    },
    applicableItems: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: function () {
                    
                    return this.applicableType === 'category' ? Category : Product;
                }
            }
        ],
        required: true,
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
    },
   
}, {
    timestamps: true,});


module.exports =mongoose.model("Offer", offerSchema);
