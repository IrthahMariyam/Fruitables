// const multer = require('multer');
// const path = require('path');

// // Set up storage
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         console.log("fdhgvdkfghb")
//         const uploadPath = path.join(__dirname, '../public/uploads/product-images/');
//         cb(null, uploadPath);  // Ensure path is correct
//     },
//     filename: (req, file, cb) => {
//         cb(null, Date.now() + path.extname(file.originalname));  // Unique filename
//     }
// });

// module.exports = storage;
