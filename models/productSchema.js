const mongoose=require('mongoose');
const {Schema}=mongoose;

const productSchema=new Schema({
    productName:{
        type:String,
        required:true,
    },
    description:{
        type:String,
        required:true,
    },
    category:{
        type:Schema.Types.ObjectId,
        ref:"Category",
       required:true,
    },
    item:{
        type :String,
        enum: ['Fruit', 'Vegetable','vegetable'],
         
      
    },
    
    price:{
        type:Number,
        required:true,
    },
    salesPrice:{
        type:Number,
        required:true,
    },
    productOffer:{
        type:Number,
        default:0,
    },
    color:{
       type:String, 
    },
    stock:{
        type:Number,
        default:0,
    },
    productImage:{
        type:[String],
        required:true,
    },
    isListed:{
        type:Boolean,
        default:true,
    },
    isDeleted:{
        type:Boolean,
        default:false
    },
      status:{
        type:String,
        enum:["Available","out of stock","Removed"],
        required:true,
        default:"Available",
    }, 
    review:[{
        username:{
            type:String
        },
        text:{
            type:String
        },
        rating:{
            type:Number
        },
        date:{
            type:Date
        },
    }],

    isFeatured: { type: Boolean, default: false },
  popularity: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 },
  createdOn: { type: Date, default: Date.now },
  });

    
    
    const Product=mongoose.model("Product",productSchema)
    module.exports=Product
