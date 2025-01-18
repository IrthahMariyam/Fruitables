const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const env = require("dotenv").config();
const session = require("express-session");


const getCartPage = async (req, res) => {
    try {
      // Check if the session exists
      if (!req.session.user) {
        return res.redirect('/login'); // Redirect to login page if not logged in
      }
  
      const userId = req.session.user._id;
  
      // Retrieve the cart for the logged-in user
      const cart = await Cart.findOne({ userId }).populate('items.productId');
      //console.log(cart,"cart")
            // Render the cart page with cart data
      if (!cart) { 
        
        return res.render('cart',  {cart: [], totalPrice: 0 }); // Render empty cart view
       }
       let totalamount= cart.items.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(0) ;
      let total=Math.round(totalamount)
      //console.log(total)
      //console.log(totalamount)
        res.render('cart', {
        user: req.session.user,
        cart: cart || { items: [] },
        total:total // If no cart, send an empty cart
      });
    
    }catch (error) {
      console.error('Error fetching cart:', error);
      res.status(500).send('An error occurred while loading the cart page.');
    }
  };


  


const addToCart = async (req, res) => {
    try {
      const { productId } = req.body;
      const userId = req.session.user._id;
  
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
  
      if (product.stock == 0) {
        return res.status(400).json({ error: 'This product is out of stock' });
      }
  
      let cart = await Cart.findOne({ userId });
  
      if (!cart) {
        cart = new Cart({
          userId,
          items: [
            {
              productId,
              quantity: 1,
              price: product.price,
              totalPrice: product.price,
            },
          ],
        });
       // product.stock -= 1; // Reduce stock
      } else {
        const existingProduct = cart.items.find((item) => item.productId.toString() === productId);
  
        if (existingProduct) {
          if (existingProduct.quantity >= product.stock) {
            return res
              .status(400)
              .json({ error: `Only ${product.stock} units are available in stock` });
          }
  
          existingProduct.quantity += 1;
          existingProduct.totalPrice = existingProduct.quantity * existingProduct.price;
        //  product.stock -= 1; // Reduce stock
        } else {
          cart.items.push({
            productId,
            quantity: 1,
            price: product.price,
            totalPrice: product.price,
          });
       //   product.stock -= 1; // Reduce stock
        }
      }
  
      await cart.save();
      await product.save();
  
      res.status(200).json({ message: 'Product added to cart successfully!', cart });
    } catch (error) {
      console.error('Error adding product to cart:', error);
      res.status(500).json({ error: 'Failed to add product to cart' });
    }
  };
  

  

const removeFromCart = async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: 'User not logged in' });
      }
  
      const { productId } = req.body;
      const cart = await Cart.findOne({ userId: user._id });
      if (!cart) {
        return res.status(404).json({ error: 'Cart not found' });
      }
  
      const itemIndex = cart.items.findIndex((item) => item.productId.toString() === productId);
      if (itemIndex === -1) {
        return res.status(404).json({ error: 'Product not found in cart' });
      }
  
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ error: 'Product not found in inventory' });
      }
  
      // Update product stock
      const removedItem = cart.items[itemIndex];
     // product.stock += removedItem.quantity;
  
      // Remove item from cart
      cart.items.splice(itemIndex, 1);
  
      await cart.save();
      await product.save();
  
      res.status(200).json({ message: 'Product removed from cart' });
    } catch (error) {
      console.error('Error removing product from cart:', error);
      res.status(500).json({ error: 'Failed to remove product from cart' });
    }
  };
  

const updateCartQuantity = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: "User not logged in" });
    }

    const { productId, quantity } = req.body;
    if (!productId || quantity == null) {
      return res.status(400).json({ error: "Product ID and quantity are required" });
    }

    const cart = await Cart.findOne({ userId: user._id });
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const item = cart.items.find((item) => item.productId.toString() === productId);
    if (!item) {
      return res.status(404).json({ error: "Product not found in cart" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found in inventory" });
    }

    // Validate quantity against stock
    // if (quantity>product.stock) {
 
    //   return res.status(400).json({ error: `Product is out of stock. Only ${product.stock} units available.` });
    // }

    // Update cart item
    item.quantity = quantity;
    item.totalPrice = item.quantity * item.price; // Recalculate total price based on new quantity

    await cart.save(); // Save updated cart

    res.status(200).json({ message: "Cart updated successfully" });
  } catch (error) {
    console.error("Error updating cart:", error);
    res.status(500).json({ error: "Failed to update cart" });
  }
};





  
  const getCheckoutPage=async(req,res)=>{
    try {
      
   // Fetch the cart for the logged-in user
   const userId = req.session.user._id; // Ensure the user is authenticated
   //console.log(req.session,"user session")
   //console.log(userId)
   const cart = await Cart.findOne({ userId }).populate("items.productId");
  const address=await Address.find({userId})
  //console.log(address)
   if (!cart) {
     return res.render("checkout", { 
       cart: { items: [], total: 0 }, // Empty cart fallback
       user: req.user ,
       address:address,
     });
   }

   // Calculate the total price (if not pre-calculated in DB)
   let total = 0;
   cart.items.forEach(item => {
     total += item.totalPrice;
   });

   // Render the checkout page with the cart data
   
   res.render("checkout", {
     cart,
     total,
     address:address,
     user: req.session.user,
   });
 } catch (error) {
   console.error("Error loading checkout page:", error);
   res.status(500).send("An error occurred while loading the checkout page.");
 }
};



const placeOrder = async (req, res) => {
  try {
      const { address, paymentMethod, orderedItems } = req.body;

      if (!orderedItems || !Array.isArray(orderedItems) || !orderedItems.length) {
          return res.status(400).json({ error: "No items in the order." });
      }
      if(!address) {
          return res.status(400).json({ error: "Address is required." });
      }
      if (!paymentMethod) {
          return res.status(400).json({ error: "Payment method is required." });
      }

      // Calculate total price
      let totalPrice = 0;
      const productitems=[];
     
      const addid=await Address.findById(address)
    
      for (const item of orderedItems) {
            const product = await Product.findById(item._id);
           // console.log(item._id)
            if (!product) {

            console.error(`Product with ID ${item.product} not found.`);
            return res.status(404).json({ error: `Product with ID ${item.product} not found.` });
          }
          const balance=parseInt(product.stock)-parseInt(item.quantity);
          if (balance<0) {
        
            return res.status(400).json({ error: `Insufficient stock for product ${product.productName}.` });
          }
          totalPrice += item.quantity * product.price;
     //     console.log(totalPrice,"totalPrice")
          productitems.push({
            product: product._id,
             quantity: item.quantity,
              price: product.price
          })
         
      }

      // Apply discount if any
      const finalAmount = totalPrice - (req.body.discount || 0);

      // Create the order
      const order = new Order({
        orderedItems:productitems,
          totalPrice,
          finalAmount,
          addressId:address,
          userId:addid.userId,
          status: "Processing",
          paymentMethod,
      });
      await order.save();

      // Update product stock
      for (const item of orderedItems) {
               const updt=  await Product.findByIdAndUpdate(
              item._id,
              { $inc: { stock: -item.quantity } },
              { new: true }
          );
          if(updt)
            console.log("successuly updated stock")
          else
          console.log("not updated")
      }

      // Delete cart for the user

   const success=  await Cart.findOneAndDelete({ userId:addid.userId });
if(success){
      res.status(200).json({success:true ,message: "Order placed successfully.", order });
console.log("success deletion")}
    else{
    console.log("error")
    return res.status(500).json({ success: false, error: "Failed to delete cart." });
  }} catch (err) {
      console.error("Error placing order:", err);
      res.status(500).json({ success:false,error: "Error placing order.", details: err.message });
  }
};




  
  module.exports={
    getCartPage,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    getCheckoutPage,
    placeOrder,
  }