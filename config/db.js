const mongoose=require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const env=require('dotenv').config()
const connectDB=async()=>{
    try{

      await mongoose.connect(process.env.MONGODB_URI);
        console.log("DB connected")
    }catch(error){
        console.log("Db connection error",error.message)
        process.exit(1)
    }
}
module.exports=connectDB