const express=require('express')
const router=express.Router();
const adminController=require("../controllers/admin/adminController")
const {userAuth,adminAuth}=require('../middlewares/auth')
//const multer=require('multer');
const path=require("path")
// const storage=require('../helpers/multer')
// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, 'public/images');
//     },
//     filename: function (req, file, cb) {
//         const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//         cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
//     }
// });

//const uploads = multer({ storage: storage });

router.get("/pageerror",adminController.pageerror)
router.get("/login",adminController.loadLogin)
router.post("/login",adminController.login)
router.get("/",adminAuth,adminController.loadDashboard)
router.get("/dashboard",adminAuth,adminController.loadDashboard)
router.get("/logout",adminController.logout)


// router.get("/user",adminAuth,customerController.customerInfo)
router.get("/user",adminAuth,adminController.findUsers)
router.get("/searchUser",adminAuth,adminController.findUsers)
router.post("/blockUser/:id",adminAuth,adminController.userBlocked)
router.get("/unblockUser",adminAuth,adminController.userunBlocked)
router.get("/listUser",adminAuth,adminController.userListed)
router.get("/unlistUser",adminAuth,adminController.userunListed)

//category
router.get("/category",adminAuth,adminController.categoryInfo)
router.post("/addCategory",adminAuth,adminController.addCategory)
router.get("/listCategory",adminAuth,adminController.categoryListed)
router.get("/unlistCategory",adminAuth,adminController.categoryunListed)
router.get("/editCategory",adminAuth,adminController.editCategory)
router.post("/editCategory/:id",adminAuth,adminController.editCategory)
router.post("/deleteCategory/:id",adminAuth,adminController.deleteCategory)
router.get("/searchCategory",adminAuth,adminController.categoryInfo)


//product
router.get("/products",adminAuth,adminController.productInfo)
router.get("/addProducts",adminAuth,adminController.getProductAddPage)
router.post("/addProducts", adminAuth, adminController.addProducts);
router.get("/listProduct",adminAuth,adminController.productListed)
router.get("/unlistProduct",adminAuth,adminController.productunListed)
router.get("/searchProduct",adminAuth,adminController.productInfo)
router.get("/geteditProduct/:id",adminAuth,adminController.getEditProduct)
router.post("/editProduct/:id",adminAuth,adminController.postEditProduct)
router.post("/deleteProduct/:id",adminAuth,adminController.deleteProduct)



// Order Management
router.get('/orders', adminController.listOrders);
router.post('/orders/update-status/:orderId', adminController.updateOrderStatus);
router.post('/orders/cancel/:id', adminController.cancelOrder);
router.get('/getorderdetails/:orderid',adminAuth,adminController.getordedetailspage)

// Inventory Management
router.get('/inventory', adminController.listInventory);
router.post('/inventory/update-stock', adminController.updateStock);

module.exports=router;