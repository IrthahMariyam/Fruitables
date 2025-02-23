const mongoose=require('mongoose')
const User=require("../../models/userSchema")
const Category=require("../../models/categorySchema")
const Product=require('../../models/productSchema')
const Order = require('../../models/orderSchema')
const Coupon=require('../../models/couponSchema')


// Get all coupons
const getCouponPage = async (req, res) => {
    try {
        const coupons = await Coupon.find();
        res.status(200).render("admin-coupon",{coupons:coupons});
    } catch (error) {
        console.error("Error fetching coupons:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// Add coupon
const addCoupon = async (req, res) => {
  try {
    const {
      couponCode,
      startDate,
      endDate,
      minPrice,
      usageLimit,
      discount,
      description,
    } = req.body;
console.log(req.body)
    // Validation
    const now = new Date();
    if (!couponCode || !startDate || !endDate || !minPrice || !usageLimit || !discount || !description) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    if (new Date(startDate) < now) {
      return res.status(400).json({ success: false, message: "Start date must be in the future." });
    }

    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ success: false, message: "End date must be after the start date." });
    }

    if (minPrice <= 0) {
      return res.status(400).json({ success: false, message: "Minimum price must be greater than zero." });
    }

   

    if (discount <= 0 || discount > 150) {
      return res.status(400).json({ success: false, message: "Discount must be between 1 and 100." });
    }

    // Create a new coupon
    const coupon = new Coupon({
      couponCode,
      startDate,
      endDate,
      minPrice,
      usageLimit,
      discount,
      description,
    });
    console.log("coupon",coupon)

    await coupon.save();
    res.status(201).json({ success: true, message: "Coupon added successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// Delete coupon
const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCoupon = await Coupon.findByIdAndDelete(id);

    if (!deletedCoupon) {
      return res.status(404).json({ success: false, message: "Coupon not found." });
    }

    res.status(200).json({ success: true, message: "Coupon deleted successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const updateCoupon = async( req,res)=>{
  
  try {console.log("inside update coupon")
      const couponId = req.params.id
      console.log(couponId,"couponId in update coupon")
      const {code,discount,minPrice,startDate,endDate, usageLimit,description,}=req.body
      console.log("req.body",req.body)
      if (!code || discount < 0 || discount > 100 || minPrice < 0 || new Date(startDate) < new Date() || new Date(endDate) <= new Date(startDate)) {
          return res.status(400).json({ success: false, message: 'Invalid input data' });
      }
      let changeCode= code.toUpperCase()
    
      const check = await Coupon.find({code:changeCode})
      // if(check){
      //    // return res.status(404).json({ success: false, message: 'Coupon Code Already used' });
      // }
     const updatedCoupon= await Coupon.findByIdAndUpdate(couponId,{
      couponCode:changeCode,
      discount,
      minPrice,
      startDate,
      endDate,
      usageLimit,
      description,
     })
      
     if (!updatedCoupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
  }
  
  res.json({ success: true, message: 'Coupon updated successfully'});
  } catch (error) {
      console.log(error)
      res.status(500).json({ success: false, message: 'Server error' });
      
  }
}
// coupon activate and deactivate 
const couponStatus = async (req,res)=>{
  
  const couponId = req.params.id;
  const { active } = req.body;
  console.log(active,"gfdfdddfdfdffd")

  try {
    console.log(couponId,req.body,"ytretrerere")
    
      const coupon = await Coupon.findByIdAndUpdate(couponId, { active }, { new: true });  
      if (!coupon) {
          return res.status(404).json({success:false, message: 'Coupon not found' });
      }console.log(coupon)
      res.status(200).json({ success:true,message: 'Coupon updated successfully', coupon });
  } catch (error) {
      console.log('Error updating coupon:', error);
      res.status(500).json({success:false, message: 'Server error' });
  }

}
module.exports={
    getCouponPage,
    addCoupon,
    deleteCoupon,
    updateCoupon,
    couponStatus,
}