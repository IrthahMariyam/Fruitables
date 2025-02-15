const express=require('express')
const router=express.Router()
const {userAuth,adminAuth}=require('../middlewares/auth')
const userController=require('../controllers/user/userController')
const profileController=require('../controllers/user/profileController')
const cartController=require('../controllers/user/cartController')
const productController=require('../controllers/user/productController')
const whishlistController=require('../controllers/user/whishlistController')
const couponController=require('../controllers/user/couponController')
const orderController=require('../controllers/user/orderController')
const passport = require('passport')
//const { userAuth } = require('../middlewares/auth')
const User = require('../models/userSchema')
const Address = require('../models/addressSchema')




router.get('/',userAuth,userController.loadHomepage)
router.get('/home',userAuth,userController.loadHomepage)
router.get("/signup",userController.loadSignup)
router.post('/signup',userController.signup)
router.post('/verify-otp',userController.verifyOTP)
router.post('/resend-otp',userController.resendOtp);
router.get('/forgotpassword',userController.getforgotPasswordPage)
router.post('/forgot-pass',userController.forgotpasswordEmail)
router.get('/forgot-verify-otp',userController.getverifyOTPpage)
router.post('/forgot-verify-otp',userController.forgotverifyOTP)

router.get("/reset-password",userController.getResetPasswordPage)
router.post("/reset-password",userController.postNewPassword)

router.get('/pageNotFound',userController.pageNotFound)

router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))


router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/signup' }), async(req, res) => {
   
    console.log("User Profile:", req.user);
    console.log("User Email:", req.user.email);
    const findUser=await User.findOne({email:req.user.email,isAdmin:false})

    req.session.user=findUser
    
    res.redirect("/")  
});


router.get('/login',userController.loadLogin)
router.post('/login',userController.userlogin)

router.get('/logout',userController.logout)

//router.get('/products',userController.getFilteredProducts)
router.get("/shop",userController.loadShopping)
router.get('/search',productController.searchProducts);
router.get('/filter',productController.filterProduct)
router.get('/filtercategory',productController.filterCategory)
router.get('/sortproduct',productController.searchProducts)
router.get("/productDetails",productController.productDetails)
router.post('/productreview',productController.productReview)



//profile routes
router.get("/userProfile/:userId",userAuth,profileController.loadProfile)
router.get('/getprofileDetail/:userId',userAuth,profileController.getProfileDetail)
router.post('/updateDetail/:userId',userAuth,profileController.updateProfileDetail)
router.post("/deleteAccount/:userId",userAuth,profileController.deleteAccount)
router.post("/changePassword/:userId",userAuth,profileController.changePassword)
// router.get('/updateemail',userAuth,profileController.getUpdateEmailPage)
router.post("/addAddress",userAuth,profileController.addAddress)
router.get("/getAddress/:id",userAuth,profileController.getAddress)
router.post("/updateAddress/:id",userAuth,profileController.updateAddress)
router.post("/deleteAddress/:addressId",userAuth,profileController.deleteAddress)

router.get('/api/history',userAuth,orderController.history)
router.get("/orders/history",userAuth,orderController.orderHistory)
router.post('/orders/cancel/:id',userAuth,orderController.cancelOrder)
router.post('/orders/reutrnrequest/:id', orderController.returnOrder);
router.get('/viewOrderDetails/:orderId',userAuth,orderController.getOrderDetails)


//cart routes
router.get('/getcart',userAuth,cartController.getCartPage)
router.post("/cart/add",userAuth,cartController.addToCart);
router.post('/cart/update', userAuth, cartController.updateCartQuantity);
router.post('/cart/remove', userAuth, cartController.removeFromCart);
router.get('/getcheckout',userAuth,cartController.getCheckoutPage);
router.post('/placeorder',userAuth,cartController.placeOrder)

//whishlist routes
router.post('/wishlist/add',userAuth,whishlistController.addtoWishlist)
router.get('/getWishlist',userAuth,whishlistController.getWishlistPage)
router.post('/wishlist/remove', userAuth, whishlistController.removeFromWishlist);
router.post("/whishlisttocart/add",userAuth,whishlistController.whishlistToCart);

//coupon routes
router.get('/getCouponCodes',userAuth,couponController.getCouponCodes)
router.post('/applyCoupon',userAuth,couponController.applyCoupon)
router.post('/removeCoupon',userAuth,couponController.removeCoupon)

module.exports=router;

