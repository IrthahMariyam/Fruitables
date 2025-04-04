const mongoose=require('mongoose')

const Coupon=require('../../models/couponSchema')
const {STATUS,MESSAGES}=require("../../config/constants")


const getCouponPage = async (req, res) => {
    try {
       
        const page=req.query.page || 1 ;
        const totalCoupons=await Coupon.countDocuments();
        const limit=10;
        const totalPages=Math.ceil(totalCoupons/limit)
        const coupons = await Coupon.find()
        .lean()
        .skip((page-1)*limit)
        .limit(limit)

        res.status(STATUS.SUCCESS).render("admin-coupon",{coupons:coupons,totalPages,currentPage:page});
    } catch (error) {
        
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

    // Validation
    const now = new Date();
    const start = new Date(startDate);
  
    // Reset both dates to midnight for comparison
    now.setHours(0,0,0,0);
    start.setHours(0,0,0,0);
  
    if (start < now) {
      return res.status(STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.START_DATE });
    }

    if (!couponCode || !startDate || !endDate || !minPrice || !usageLimit || !discount || !description) {
      return res.status(STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.FIELD_REQUIRED });
    }

    if (new Date(startDate) < now) {
      return res.status(STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.START_DATE });
    }

    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.END_DATE });
    }

    if (minPrice <= 100) {
      return res.status(STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.MIN_PRICE});
    }

   

    if (discount <= 1 || discount > 70) {
      return res.status(STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.DISCOUNT_RANGE });
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
   

    await coupon.save();
    res.status(STATUS.CREATED).json({ success: true, message: MESSAGES.CATEGORY_ADDED });
  } catch (error) {
    
    res.status(STATUS.SERVER_ERROR).json({ success: false, message: MESSAGES.SERVER_ERROR});
  }
};

// Delete coupon
const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCoupon = await Coupon.findByIdAndDelete(id);

    if (!deletedCoupon) {
      res.redirect("/pageerror");
    }

    res.status(STATUS.SUCCESS).json({ success: true, message:MESSAGES.COUPON_DELETED });
  } catch (error) {
    
    res.status(STATUS.SERVER_ERROR).json({ success: false,message: MESSAGES.INTERNAL_ERROR});
  }
};

const updateCoupon = async( req,res)=>{
 
  try {
      const couponId = req.params.id
     
      const {code,discount,minPrice,startDate,endDate, usageLimit,description,}=req.body
     
      if (!code || discount < 1 || discount > 70 || minPrice <=100 || new Date(endDate) <= new Date(startDate)) {
          return res.status(STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.INVALID_INPUT });
      }
      let changeCode= code.toUpperCase()
    
      
    
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
      res.redirect("/pageerror");
  }
  
  res.json({ success: true, message: MESSAGES.COUPON_UPDATED});
  } catch (error) {
      
      res.status(STATUS.SERVER_ERROR).json({ success: false, message: MESSAGES.INTERNAL_ERROR });
      
  }
}
// coupon activate and deactivate 
const couponStatus = async (req,res)=>{
  try{
 
  const couponId = req.params.id;
  const { active } = req.body;
  const coupon = await Coupon.findById(couponId);
  if (!coupon) {
    return res.status(404).json({ success: false, message: 'Coupon not found' });
  }
  coupon.active = active;
  await coupon.save();
  res.status(200).json({ 
    success: true, 
    message: `Coupon ${active ? 'activated' : 'deactivated'} successfully`,
    isActive: coupon.active 
  });
} catch (error) {
      
      res.status(STATUS.SERVER_ERROR).json({success:false, message: MESSAGES.INTERNAL_ERROR });
  }

}
module.exports={
    getCouponPage,
    addCoupon,
    deleteCoupon,
    updateCoupon,
    couponStatus,
}