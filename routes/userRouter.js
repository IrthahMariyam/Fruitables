const express=require('express')
const router=express.Router()
const {userAuth,adminAuth}=require('../middlewares/auth')
const userController=require('../controllers/user/userController')
const profileController=require('../controllers/user/profileController')
const cartController=require('../controllers/user/cartController')
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
router.get("/shop",userController.loadShopping)
router.get('/pageNotFound',userController.pageNotFound)

router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))


router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/signup' }), async(req, res) => {
    // After authentication, you can access the user info from req.user
    console.log("User Profile:", req.user);
    console.log("User Email:", req.user.email);
    const findUser=await User.findOne({email:req.user.email,isAdmin:false})

    req.session.user=findUser
    // You can also send this info to the front-end if needed
    res.redirect("/")  // Redirecting the user to the home page (or wherever you want)
});


router.get('/login',userController.loadLogin)
router.post('/login',userController.userlogin)


router.get('/logout',userController.logout)

//router.get('/products',userController.getFilteredProducts)
router.get('/search',userController.searchProducts);
router.get('/filter',userController.filterProduct)
router.get('/sortproduct',userController.searchAndSortProducts)
router.get("/productDetails",userController.productDetails)
router.post('/productreview',userController.productReview)


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
router.get('/api/history',userAuth,profileController.history)
router.get("/orders/history",userAuth,profileController.orderHistory)
router.post('/orders/cancel/:id',userAuth,profileController.cancelOrder)
router.get('/viewOrderDetails/:orderId',userAuth,profileController.getOrderDetails)
//cart routes
router.get('/getcart',userAuth,cartController.getCartPage)
router.post("/cart/add",userAuth,cartController.addToCart);
router.post('/cart/update', userAuth, cartController.updateCartQuantity);
router.post('/cart/remove', userAuth, cartController.removeFromCart);
router.get('/getcheckout',userAuth,cartController.getCheckoutPage);
router.post('/placeorder',userAuth,cartController.placeOrder)

module.exports=router;

