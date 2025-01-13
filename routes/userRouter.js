const express=require('express')
const router=express.Router()
const {userAuth,adminAuth}=require('../middlewares/auth')
const userController=require('../controllers/user/userController')
const profileController=require('../controllers/user/profileController')
const passport = require('passport')
//const { userAuth } = require('../middlewares/auth')
const User = require('../models/userSchema')
const Address = require('../models/addressSchema')
//const profileController=require('../controllers/user/profileController')



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
// router.get('/userProfile',userController.getProfilePage)

router.get('/logout',userController.logout)


router.get('/filter',userController.filterProduct)
router.get("/productDetails",userController.productDetails)
router.post('/productreview',userController.productReview)


//profile routes
router.get("/userProfile/:userId",userAuth,profileController.loadProfile)
router.post("/deleteAccount/:userId",userAuth,profileController.deleteAccount)
router.post("/changePassword/:userId",userAuth,profileController.changePassword)
router.post("/addAddress",userAuth,profileController.addAddress)
router.get("getAddress/:id",userAuth,profileController.getAddress)
router.put("updateAddress/:id",userAuth,profileController.updateAddress)
router.post("/deleteAddress/:id",userAuth,profileController.deleteAddress)



module.exports=router;

