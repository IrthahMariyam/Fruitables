const mongoose=require('mongoose')
const {Schema}=mongoose
const addressSchema=new Schema({
   
        name: { 
            type: String,
             required: true },
        landmark:
         { type: String,
             required: true },
        district: 
        { type: String,
             required: true },
        state:
         { type: String,
             required: true },
        pincode:
         { type: String,
             required: true },
        phone: 
        { type: String,
             required: true },
        userId: 
        { type: mongoose.Schema.Types.ObjectId, 
            ref: 'User' }, // Reference to the User
      
      
})
const Address=mongoose.model("Address",addressSchema)
module.exports=Address;
