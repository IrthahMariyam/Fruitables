const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const Wishlist= require('../../models/whishlistSchema')
const User = require("../../models/userSchema");

const addtoWishlist = async (req, res) => {
    try {console.log('addtoWishlist1111=========================================================================')
        const user = req.session.user;
        console.log(user, "User in wishlist");

        if (!user) {
            return res.status(401).json({ error: "Please login to add a product to wishlist" });
        }

        const { productId } = req.body;
        console.log(productId, "Product ID in wishlist");

        if (!productId) {
            return res.status(400).json({ error: "Product ID is required" });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        let wishlistDoc = await Wishlist.findOne({ userId: user._id });

       
        if (!wishlistDoc) {
            wishlistDoc = new Wishlist({
                userId: user._id,
                productId: [productId],
            });

            await wishlistDoc.save();
            return res.status(200).json({ success: "Product successfully added to wishlist" });
        } 

        const existingProduct = wishlistDoc.products.find((item) => item.productId.toString() === productId);
      
       if(existingProduct){
            return res.status(200).json({ message:"Product already in wishlist" });
        }

       
        wishlistDoc.products.push({productId});
        await wishlistDoc.save();

        return res.status(200).json({ success: "Product successfully added to wishlist" });

    } catch (error) {
        console.error("Error adding to wishlist:", error);
        return res.status(500).json({error: "Internal server error" });
    };
}  

    const getWishlistPage = async (req, res) => {
    try {
      console.log('getWishlistPage1111=========================================================================')
    
    const user = req.session.user;
    if (!user) {
      return res.redirect('/login'); 
     }
     console.log("user",user)
    const userData = await User.findOne({_id: user._id });
    console.log(userData)
    const carts = await Cart.findOne({userId:userData._id }).populate('items.productId');
        //console.log(cart,"cart")
        const wishlist = await Wishlist.findOne({userId: userData._id }).populate('products.productId');    
    if (!wishlist) { 
    
     
     return res.render('wishlist',  {wishlist: [],cart:carts,user:userData }); 
    }
     
     res.render('wishlist', {
     user: req.session.user,
    wishlist,     
     cart:carts,
    
    });
 
 }catch (error) {
   console.error('Error fetching wishlist:', error);
   res.status(500).send('An error occurred while loading the wishlist page.');
 }
};


 

const removeFromWishlist = async (req, res) => {
    try {console.log('removeFromWishlist1111=========================================================================')
      
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: 'User not logged in' });
      }
  
      const { productId } = req.body;
      let wishlist = await Wishlist.findOne({ userId: req.session.user._id });
      if (!wishlist) {
        return res.status(404).json({ error: 'Wishlist not found' });
      }
  
      const itemIndex = wishlist.products.findIndex((item) => item.productId.toString() === productId);
      if (itemIndex === -1) {
        return res.status(404).json({ error: 'Product not found in wishlist' });
      }
  
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ error: 'Product not found in inventory' });
      }
  
      const removedItem = wishlist.products[itemIndex];
    
  
     wishlist.products.splice(itemIndex, 1);
  
      await wishlist.save();
    
     // cart = await Cart.findOne({ userId:req.session.user._id })
     //let cartitemcount=cart.items.length
      res.status(200).json({ success: 'Product removed from wishlist' });
    } catch (error) {
      console.error('Error removing product from wishlist:', error);
      res.status(500).json({ error: 'Failed to remove product from wishlist' });
    }
  };


  const whishlistToCart = async (req, res) => {
    try {
       console.log('whishlistToCart1111=========================================================================')
      
      const { productId } = req.body; 
      console.log("product",req.body)

      const userId = req.session.user; 
      console.log(req.session.user,"userId")

      let cartitemcount=0;
      if(!userId)
      return res.status(404).json({error:"Please Login to add a product"})

      const product = await Product.findById({_id:productId,isListed:true});
      console.log("product",product)
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
  
      if (product.stock === 0) {
        return res.status(400).json({ error: 'This product is out of stock' });
      }
  
      let cart = await Cart.findOne({userId: userId._id });
        console.log("cart====",cart)
      if (!cart) {

        // if (product.stock < 1) {
        //   return res.status(400).json({ error: 'Insufficient stock to add to cart' });
        // }
  
        cart = new Cart({
         userId: userId._id,
          items: [
            {
              productId,
              quantity: 1,
              price: product.salesPrice,
              totalPrice: product.salesPrice,
            },
          ],
        });
        cartitemcount=1
      } else {
        const existingProduct = cart.items.find((item) => item.productId.toString() === productId);
  
        if (existingProduct) {
          // if (existingProduct.quantity >= product.stock) {
          //   return res
          //     .status(400)
          //     .json({ error: `Only ${product.stock} units are available in stock` });
          // }
  
          // if (existingProduct.quantity + 1 > 5) {
          //   return res.status(400).json({ error: 'You cannot add more than 5 units of this product' });
          // }
  
          // existingProduct.quantity += 1;
          // existingProduct.totalPrice = existingProduct.quantity * existingProduct.price;

            res.status(200).json({ message: 'Product already added in cart!', cart,cartitemcount:cartitemcount });
            
       
        }
         else {
         
  
          cart.items.push({
            productId,
            quantity: 1,
            price: product.salesPrice,
            totalPrice: product.salesPrice,
          });
        }}
          await cart.save();
     // cart = await Cart.findOne({ userId:userId._id })
      cartitemcount=cart.items.length

      let wishlist = await Wishlist.findOne({ userId: req.session.user._id }); 
      if(wishlist){
      const itemIndex = wishlist.products.findIndex((item) => item.productId.toString() === productId);
      if (itemIndex === -1) {
        return res.status(404).json({ error: 'Product not found in wishlist' });
      }
  
      
      // const removedItem = wishlist.products[itemIndex];
     // product.stock += removedItem.quantity;
  
     wishlist.products.splice(itemIndex, 1);
  
     const removed= await wishlist.save();
    
if(removed)console.log("removed from wishlist")

      res.status(200).json({ message: 'Product added to cart successfully!', cart,cartitemcount:cartitemcount });
        
      
}
      
    } catch (error) {
      console.error('Error adding product to cart:', error);
      res.status(500).json({ error: 'Failed to add product to cart.Please login again ' });
    }
  };


// const whishlistToCart = async (req, res) => {
//   try {
//       console.log('whishlistToCart function called');

//       const { productId } = req.body;
//       console.log("Product ID:", productId);

//       // Check if user is logged in
//       if (!req.session.user) {
//           console.log("User session not found. Redirecting to login.");
//           return res.status(401).json({ error: "Please login to add a product" });
//       }

//       const userId = req.session.user;
//       console.log("User ID from session:", userId);

//       // Check if the product exists and is listed
//       const product = await Product.findOne({ _id: productId, isListed: true });
//       console.log("Product Details:", product);

//       if (!product) {
//           return res.status(404).json({ error: 'Product not found or is not listed' });
//       }

//       if (product.stock === 0) {
//           return res.status(400).json({ error: 'This product is out of stock' });
//       }

//       // Find user's cart
//       let cart = await Cart.findOne({ userId: userId._id });
//       console.log("User's Cart:", cart);

//       let cartitemcount = 0;

//       if (!cart) {
//           // Create a new cart if it doesn't exist
//           cart = new Cart({
//               userId: userId._id,
//               items: [{
//                   productId,
//                   quantity: 1,
//                   price: product.price,
//                   totalPrice: product.price,
//               }],
//           });
//           cartitemcount = 1;
//       } else {
//           // Check if the product already exists in the cart
//           const existingProduct = cart.items.find(item => item.productId.toString() === productId);

//           if (existingProduct) {
//               if (existingProduct.quantity >= product.stock) {
//                   return res.status(400).json({ error: `Only ${product.stock} units are available in stock` });
//               }

//               if (existingProduct.quantity + 1 > 5) {
//                   return res.status(400).json({ error: 'You cannot add more than 5 units of this product' });
//               }

//               // Increment quantity if the product is already in the cart
//               existingProduct.quantity += 1;
//               existingProduct.totalPrice = existingProduct.quantity * existingProduct.price;

//               await cart.save();
//               console.log("Product already in cart. Quantity updated.");
//               return res.status(200).json({ message: 'Product already added to cart!', cart, cartitemcount });
//           } else {
//               // Add new product to cart
//               cart.items.push({
//                   productId,
//                   quantity: 1,
//                   price: product.price,
//                   totalPrice: product.price,
//               });
//           }
//       }

//       await cart.save();
//       cart = await Cart.findOne({ userId: userId._id });
//       cartitemcount = cart.items.length;

//       // Find and remove the product from wishlist
//       let wishlist = await Wishlist.findOne({ userId: userId._id });

//       if (wishlist) {
//           const itemIndex = wishlist.products.findIndex(item => item.productId.toString() === productId);

//           if (itemIndex !== -1) {
//               wishlist.products.splice(itemIndex, 1);
//               await wishlist.save();
//               console.log("Product removed from wishlist.");
//           } else {
//               console.log("Product not found in wishlist.");
//           }
//       } else {
//           console.log("Wishlist not found for user.");
//       }

//       res.status(200).json({ message: 'Product added to cart successfully!', cart, cartitemcount });

//   } catch (error) {
//       console.error('Error adding product to cart:', error);
//       res.status(500).json({ error: 'Failed to add product to cart. Please login again.' });
//   }
// };

module.exports={
    addtoWishlist,
    getWishlistPage,
    removeFromWishlist,
    whishlistToCart,
}
  
