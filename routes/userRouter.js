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
const walletController=require('../controllers/user/walletController')



const passport = require('passport')
const User = require('../models/userSchema')
const Address = require('../models/addressSchema')
const Wallet=require('../models/walletSchema')




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
router.get('/success',userAuth,userController.success)
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))


router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/signup' }), async(req, res) => {
   
    const findUser=await User.findOne({email:req.user.email,isAdmin:false})

    req.session.user=findUser
   
    
    res.redirect("/")  
});


router.get('/login',userController.loadLogin)
router.post('/login',userController.userlogin)

router.get('/logout',userController.logout)


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
router.post("/addAddress",userAuth,profileController.addAddress)
router.get("/getAddress/:id",userAuth,profileController.getAddress)
router.post("/updateAddress/:id",userAuth,profileController.updateAddress)
router.post("/deleteAddress/:addressId",userAuth,profileController.deleteAddress)


router.post('/orders/cancel/:id',userAuth,orderController.cancelOrder)
router.post('/orders/reutrnrequest/:id', orderController.returnOrder);
router.get('/viewOrderDetails/:orderId',userAuth,orderController.getOrderDetails)
router.post("/getOrderDetails",userAuth,orderController.getOrder);


router.post('/order/cancel-product',userAuth,orderController.cancelProductOrder);
router.post('/order/return-product',userAuth,orderController.returnProductOrder);
router.get('/payment-failed/:orderId',userAuth,orderController.handleFailedPayment);
router.get('/failedPayment',orderController.loadFailedPaymentPage)
router.post('/placeOrder',userAuth,orderController.placeOrder)
router.post('/razorpayverifyPayment',userAuth,orderController.verifyPayment)


//cart routes
router.get('/getcart',userAuth,cartController.getCartPage)
router.post("/cart/add",userAuth,cartController.addToCart);
router.post('/cart/update', userAuth, cartController.updateCartQuantity);
router.post('/cart/remove', userAuth, cartController.removeFromCart);
router.get('/getcheckout',userAuth,orderController.getCheckoutPage);
router.get('/download-invoice/:orderId',userAuth,orderController.generateInvoice )

//whishlist routes
router.post('/wishlist/add',userAuth,whishlistController.addtoWishlist)
router.get('/getWishlist',userAuth,whishlistController.getWishlistPage)
router.post('/wishlist/remove', userAuth, whishlistController.removeFromWishlist);
router.post("/whishlisttocart/add",userAuth,whishlistController.whishlistToCart);

//coupon routes
router.get('/getCouponCodes',userAuth,couponController.getCouponCodes)
router.post('/applyCoupon',userAuth,couponController.applyCoupon)
router.post('/removeCoupon',userAuth,couponController.removeCoupon)


//wallet
router.get('/wallet',userAuth,walletController.getWallet)
router.post("/wallet/create-order",userAuth,walletController.createAddmoneyWallet)
router.post("/wallet/add/money",userAuth,walletController.addMoneyWallet)
router.post("/wallet/purchase",userAuth,walletController.purchaseUsingWallet)



module.exports=router;

