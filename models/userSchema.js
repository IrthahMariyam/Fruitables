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
    
     
    createdOn:{
        type:Date,
        default:Date.now,
    },
   
   
    redeemedUser: {
        type: Schema.Types.ObjectId,
        ref: "Coupon",
        default: null
    },
    referralCode:{ type:String,
        default:null,
},
referredBy:{
    type:String,default:null
},
})

userSchema.pre("save", async function (next) {
    if (!this.referralCode) {
        let isUnique = false;
        let newCode;

        while (!isUnique) {
            newCode = `FR${Math.floor(100000 + Math.random() * 900000)}`; // Generate COSREF + 6-digit number
            const existingUser = await mongoose.model("User").findOne({ referralCode: newCode });

            if (!existingUser) {
                isUnique = true;
            }
        }

        this.referralCode = newCode;
    }
    next();
});

const User=mongoose.model("User",userSchema)
module.exports=User;