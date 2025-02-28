const express=require('express')
const router=express.Router();
const adminController=require("../controllers/admin/adminController")
const productController=require("../controllers/admin/productController")
const categoryController=require("../controllers/admin/categoryController")
const orderController=require("../controllers/admin/orderController")
const userController=require("../controllers/admin/userController")
const couponController=require("../controllers/admin/couponController")
const offerController=require('../controllers/admin/offerController')
const salesController=require('../controllers/admin/salesController')
const {userAuth,adminAuth}=require('../middlewares/auth')

const path=require("path");
const { loadSalesPage } = require('../controllers/admin/salesController');
const {salesReport}= require('../controllers/admin/salesController');
router.get("/loadSalesPage",adminAuth,salesController.loadSalesPage);
router.get("/sales-report",adminAuth,salesController.salesReport)

router.get("/pageerror",adminController.pageerror)
router.get("/login",adminController.loadLogin)
router.post("/login",adminController.login)
router.get("/",adminAuth,adminController.loadDashboard)
router.get("/dashboard",adminAuth,adminController.loadDashboard)
router.get("/logout",adminController.logout)

//router.get('/salesreport',adminAuth,salesController.salesReport)
//router.get('/sales-report', salesController.salesReport);
//router.get('/download-report/:format', salesController.downloadReport);


router.get("/user",adminAuth,userController.findUsers)
router.get("/searchUser",adminAuth,userController.findUsers)
router.post("/blockUser/:id",adminAuth,userController.userBlocked)
router.get("/unblockUser",adminAuth,userController.userunBlocked)
router.get("/listUser",adminAuth,userController.userListed)
router.get("/unlistUser",adminAuth,userController.userunListed)

//category
router.get("/category",adminAuth,categoryController.categoryInfo)
router.post("/addCategory",adminAuth,categoryController.addCategory)
router.get("/listCategory",adminAuth,categoryController.categoryListed)
router.get("/unlistCategory",adminAuth,categoryController.categoryunListed)
router.get("/editCategory",adminAuth,categoryController.editCategory)
router.post("/editCategory/:id",adminAuth,categoryController.editCategory)
router.post("/deleteCategory/:id",adminAuth,categoryController.deleteCategory)
router.get("/searchCategory",adminAuth,categoryController.categoryInfo)


//product
router.get("/products",adminAuth,productController.productInfo)
router.get("/addProducts",adminAuth,productController.getProductAddPage)
router.post("/addProducts", adminAuth, productController.addProducts);
router.get("/listProduct",adminAuth,productController.productListed)
router.get("/unlistProduct",adminAuth,productController.productunListed)
router.get("/searchProduct",adminAuth,productController.productInfo)
router.get("/geteditProduct/:id",adminAuth,productController.getEditProduct)
router.post("/editProduct/:id",adminAuth,productController.postEditProduct)
router.post("/deleteProduct/:id",adminAuth,productController.deleteProduct)
router.delete('/deleteImage',adminAuth,productController.deleteSingleImage);


// Order Management
router.get('/orders',adminAuth, orderController.listOrders);
router.post('/orders/update-status/:orderId', adminAuth,orderController.updateOrderStatus);
router.post('/orders/cancel/:id',adminAuth, orderController.cancelOrder);
router.get('/getorderdetails/:orderid',adminAuth,orderController.getordedetailspage)

// Inventory Management
router.get('/inventory',adminAuth, productController.listInventory);
router.post('/inventory/update-stock',adminAuth, productController.updateStock);
router.get('/searchStock',adminAuth,productController.listInventory)

//coupons
router.get('/coupon',adminAuth,couponController.getCouponPage)
router.post("/addcoupon",adminAuth, couponController.addCoupon);
router.delete("/deletecoupon/:id",adminAuth, couponController.deleteCoupon);
router.put('/coupons/update/:id',adminAuth,couponController.updateCoupon)
router.patch('/coupons/status/:id',adminAuth,couponController.couponStatus)


// Offers 
router.get('/offer',adminAuth,offerController.getOfferPage)
router.post('/offers/create',adminAuth,offerController.createOffer)
router.put('/offers/update/',adminAuth,offerController.updateOffer)
router.patch('/offers/action/:id',adminAuth,offerController.activateOffer)
router.put('/offers/ac/:id',adminAuth,offerController.deactivateOffer)


module.exports=router;