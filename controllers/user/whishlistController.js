const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const Wishlist= require('../../models/whishlistSchema')


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
    if (!req.session.user) {
     return res.redirect('/login'); 
    }
    const userId = req.session.user._id;
     
    const carts = await Cart.findOne({ userId }).populate('items.productId');
        //console.log(cart,"cart")
        const wishlist = await Wishlist.findOne({ userId }).populate('products.productId');    
    if (!wishlist) { 
    
     
     return res.render('wishlist',  {wishlist: [],cart:carts }); 
    }
     
     res.render('wishlist', {
     user: req.session.user,
    wishlist,     
     cart:carts
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
    try {console.log('whishlistToCart1111=========================================================================')
      const { productId } = req.body; 
      console.log("product",req.body)
      const userId = req.session.user; 
      console.log(req.session.user,"id")
      let cartitemcount=0;
      if(!userId)
      return res.status(404).json({error:"Please Login to add a product"})
      const product = await Product.findById(productId);
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
        if (product.stock < 1) {
          return res.status(400).json({ error: 'Insufficient stock to add to cart' });
        }
  
        cart = new Cart({
         userId: userId._id,
          items: [
            {
              productId,
              quantity: 1,
              price: product.price,
              totalPrice: product.price,
            },
          ],
        });
        cartitemcount=1
      } else {
        const existingProduct = cart.items.find((item) => item.productId.toString() === productId);
  
        if (existingProduct) {
          if (existingProduct.quantity >= product.stock) {
            return res
              .status(400)
              .json({ error: `Only ${product.stock} units are available in stock` });
          }
  
          if (existingProduct.quantity + 1 > 5) {
            return res.status(400).json({ error: 'You cannot add more than 5 units of this product' });
          }
  
          existingProduct.quantity += 1;
          existingProduct.totalPrice = existingProduct.quantity * existingProduct.price;

            res.status(200).json({ message: 'Product already added in cart!', cart,cartitemcount:cartitemcount });
            
       
        }
         else {
         
  
          cart.items.push({
            productId,
            quantity: 1,
            price: product.price,
            totalPrice: product.price,
          });
        }}
          await cart.save();
      cart = await Cart.findOne({ userId:userId._id })
      cartitemcount=cart.items.length


      const itemIndex = wishlist.products.findIndex((item) => item.productId.toString() === productId);
      if (itemIndex === -1) {
        return res.status(404).json({ error: 'Product not found in wishlist' });
      }
  
      let wishlist = await Wishlist.findOne({ userId: req.session.user._id }); 
      const removedItem = wishlist.products[itemIndex];
     // product.stock += removedItem.quantity;
  
     wishlist.products.splice(itemIndex, 1);
  
     const removed= await wishlist.save();
    
if(removed)console.log("removed from wishlist")

      res.status(200).json({ message: 'Product added to cart successfully!', cart,cartitemcount:cartitemcount });
        
      
  
      
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
  
