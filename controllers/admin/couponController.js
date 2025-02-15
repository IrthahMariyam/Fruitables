const mongoose=require('mongoose')
const User=require("../../models/userSchema")
const Category=require("../../models/categorySchema")
const Product=require('../../models/productSchema')
const Order = require('../../models/orderSchema')
const Coupon=require('../../models/couponSchema')


// Add a new coupon
// const addCoupon = async (req, res) => {
//     try {
//         const { code, discount, expiryDate } = req.body;

//         if (!code || !discount || !expiryDate) {
//             return res.status(400).json({ error: "All fields are required" });
//         }

//         const existingCoupon = await Coupon.findOne({ code });
//         if (existingCoupon) {
//             return res.status(400).json({ error: "Coupon already exists" });
//         }

//         const coupon = new Coupon({ code, discount, expiryDate });
//         await coupon.save();

//         res.status(201).json({ message: "Coupon added successfully", coupon });
//     } catch (error) {
//         console.error("Error adding coupon:", error);
//         res.status(500).json({ error: "Internal Server Error" });
//     }
// };

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

// Delete a coupon
// const deleteCoupon = async (req, res) => {
//     try {
//         const { id } = req.params;
//         await Coupon.findByIdAndDelete(id);
//         res.status(200).json({ message: "Coupon deleted successfully" });
//     } catch (error) {
//         console.error("Error deleting coupon:", error);
//         res.status(500).json({ error: "Internal Server Error" });
//     }
// };


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

module.exports={
    getCouponPage,
    addCoupon,
    deleteCoupon,
}