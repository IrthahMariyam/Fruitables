const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Coupon=require("../../models/couponSchema")
const env = require("dotenv").config();






const getCouponCodes= async(req, res)=>{
    try {
    const currentDate = new Date();
      const cartTotal = parseFloat(req.query.cartTotal) || 0;
         const userId = req.session.user._id; 
      const coupons = await Coupon.find({ 
        minPrice: { $lte: cartTotal }, 
        endDate: { $gt: currentDate }   
    });
    
      
      const availableCoupons = coupons.filter(coupon => {
      const usage = coupon.userUsage.find(u => u.userId== userId);
      return !usage || usage.usageCount < coupon.usageLimit;
      });
      
      res.status(200).json(availableCoupons);
    } catch (error) {
      console.error("Error fetching coupons:", error);
      res.status(500).json({success:false, error: "Internal Server Error" });
    }
  }
  



const applyCoupon = async (req, res) => {
    try { 
        const { couponCode, cartTotal } = req.body;
      
        const userId = req.session.user._id;
       
        if (!couponCode || !cartTotal) {
            return res.status(400).json({
                success: false,
                message: 'Coupon code and total amount are required'
            });
        }

        const parsedAmount = parseFloat(cartTotal);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid total amount'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'User not found'
            });
        }

        const coupon = await Coupon.findOne({
            couponCode: couponCode,
            
        });

        if (!coupon) {
            return res.status(400).json({
                success: false,
                message: 'Invalid coupon code'
            });
        }

        // Check coupon validity
        if (coupon.endDate < new Date()) {
            return res.status(400).json({
                success: false,
                message: 'Coupon has expired'
            });
        }

        // **ENSURE THAT THE MINIMUM PURCHASE AMOUNT IS CHECKED**
        if (parsedAmount < coupon.minPrice) {
            return res.status(400).json({
                success: false,
                message: `Minimum purchase of ₹${coupon.minPrice} required`
            });
        }
        
        // Ensure usedUsers is initialized
        if (!coupon.userUsage) {
            coupon.userUsage = [];
        }

        // Check if the user has already used the coupon
        if (coupon.userUsage.includes(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Coupon already used'
            });
        }
        
        // Apply the coupon discount
        let discount = coupon.discount;
         req.session.discount = discount
         req.session.couponCode=couponCode;
        // Prevent discount from exceeding total amount
        let finalAmount = Math.max(parsedAmount - discount, 0);
        
        // Mark coupon as used for the user

// Find if user has already used this coupon
const existingUserUsage = coupon.userUsage.find(usage => 
    usage.userId== userId
);

if (!existingUserUsage) {
    // First time user is using this coupon
    coupon.userUsage.push({
        userId: userId,
        usageCount: 1
    });
} else {
    // User has used this coupon before, increment their usage count
    existingUserUsage.usageCount += 1;
}
        

        
        await coupon.save();

        user.redeemedUser = coupon._id;
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Coupon applied successfully',
            finalAmount: finalAmount,
            discount:discount,
        });

    } catch (error) {
        console.error('Error in applyCoupon:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to apply coupon'
        });
    }
};



const removeCoupon = async (req, res) => {
    try {
        const code = req.query.couponCode;
        
        const userId = req.session.user._id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Fetch the cart
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart) {
            return res.status(400).json({
                success: false,
                message: 'Cart not found'
            });
        }
     
        // Check if the coupon exists
        const appliedCoupon = await Coupon.findOne({ couponCode: code });
if (appliedCoupon) {
    if (appliedCoupon.userUsage && appliedCoupon.userUsage.length > 0) {
        for (let coupon of appliedCoupon.userUsage) {
            if (coupon.userId.equals(userId)) {
                try {
                    if (coupon.usageCount === 1) {
                        // User has used the coupon only once, remove the user from userUsage
                        await Coupon.updateOne(
                            { couponCode: code },
                            {
                                $pull: { userUsage: { userId: userId } }
                            }
                        );
                    } else if (coupon.usageCount > 1) {
                        // User has used the coupon more than once, decrement userCount only
                        await Coupon.updateOne(
                            { couponCode: code },
                            {
                                $inc: { userCount: -1 }
                            }
                        );
                    }
                    
                } catch (error) {
                    console.error("Error updating coupon:", error);
                }
                break; // Exit loop once the user is found and handled
            }
        }
    }
}

        // Remove redeemed coupon from user
        user.redeemedUser = null;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Coupon removed successfully',
          //  finalAmount: total
        });

    } catch (error) {
        console.error('Error in removeCoupon:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove coupon'
        });
    }
};


module.exports={
    getCouponCodes,
    removeCoupon,
    applyCoupon,
}