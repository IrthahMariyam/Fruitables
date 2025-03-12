const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const Wishlist= require('../../models/whishlistSchema')
const User = require("../../models/userSchema");

const addtoWishlist = async (req, res) => {
    try {
        const user = req.session.user;
       

        if (!user) {
            return res.status(401).json({ error: "Please login to add a product to wishlist" });
        }

        const { productId } = req.body;
        

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
     
    
    const user = req.session.user;
    if (!user) {
      return res.redirect('/login'); 
     }
   
    const userData = await User.findOne({_id: user._id });
   
    const carts = await Cart.findOne({userId:userData._id }).populate('items.productId');
     
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
    try {
      
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
    
   
      res.status(200).json({ success: 'Product removed from wishlist' });
    } catch (error) {
      console.error('Error removing product from wishlist:', error);
      res.status(500).json({ error: 'Failed to remove product from wishlist' });
    }
  };


  const whishlistToCart = async (req, res) => {
    try {
     
      
      const { productId } = req.body; 
     

      const userId = req.session.user; 
     
      let cartitemcount=0;
      if(!userId)
      return res.status(404).json({error:"Please Login to add a product"})

      const product = await Product.findById({_id:productId,isListed:true});
     
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
  
      if (product.stock === 0) {
        return res.status(400).json({ error: 'This product is out of stock' });
      }
  
      let cart = await Cart.findOne({userId: userId._id });
       
      if (!cart) {

      
  
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
     
      cartitemcount=cart.items.length

      let wishlist = await Wishlist.findOne({ userId: req.session.user._id }); 
      if(wishlist){
      const itemIndex = wishlist.products.findIndex((item) => item.productId.toString() === productId);
      if (itemIndex === -1) {
        return res.status(404).json({ error: 'Product not found in wishlist' });
      }
  
     wishlist.products.splice(itemIndex, 1);
  
     const removed= await wishlist.save();
    
     res.status(200).json({ message: 'Product added to cart successfully!', cart,cartitemcount:cartitemcount });
        
      
}
      
    } catch (error) {
      console.error('Error adding product to cart:', error);
      res.status(500).json({ error: 'Failed to add product to cart.Please login again ' });
    }
  };

module.exports={
    addtoWishlist,
    getWishlistPage,
    removeFromWishlist,
    whishlistToCart,
}
  
