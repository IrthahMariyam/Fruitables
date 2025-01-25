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
       const carts = await Cart.findOne({ userId }).populate('items.productId');
           //console.log(cart,"cart")
            // Render the cart page with cart data
       if (!carts) { 
       
        
        return res.render('cart',  {carts: [], totalPrice: 0,cart:cart }); // Render empty cart view
       }
       let totalamount= carts.items.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(0) ;
       let total=Math.round(totalamount)
       //console.log(total)
       //console.log(totalamount)
        res.render('cart', {
        user: req.session.user,
        carts: carts || { items: [] },
        total:total,// If no cart, send an empty cart
        cart:carts
       });
    
    }catch (error) {
      console.error('Error fetching cart:', error);
      res.status(500).send('An error occurred while loading the cart page.');
    }
  };


  

const addToCart = async (req, res) => {
  try {
    const { productId } = req.body; // Get productId from request body
    const userId = req.session.user._id; // Get userId from session
    let cartitemcount=0;
if(!userId)
  return res.staus(404).json({error:"Please Login to add a product"})
    // Fetch the product from the database
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if the product is out of stock
    if (product.stock === 0) {
      return res.status(400).json({ error: 'This product is out of stock' });
    }

    // Find the user's cart
    let cart = await Cart.findOne({ userId });

    // If no cart exists, create a new cart
    if (!cart) {
      if (product.stock < 1) {
        return res.status(400).json({ error: 'Insufficient stock to add to cart' });
      }

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
      cartitemcount=1
    } else {
      // Check if the product already exists in the cart
      const existingProduct = cart.items.find((item) => item.productId.toString() === productId);

      if (existingProduct) {
        // Check if adding another unit exceeds available stock
        if (existingProduct.quantity >= product.stock) {
          return res
            .status(400)
            .json({ error: `Only ${product.stock} units are available in stock` });
        }

        // Check if the quantity exceeds 5
        if (existingProduct.quantity + 1 > 5) {
          return res.status(400).json({ error: 'You cannot add more than 5 units of this product' });
        }

        // Increment quantity and update total price
        existingProduct.quantity += 1;
        existingProduct.totalPrice = existingProduct.quantity * existingProduct.price;
     
      }
       else {
        // Add a new product to the cart
        // if (1 > 5) {
        //   return res.status(400).json({ error: 'You cannot add more than 5 units of this product' });
        // }

        cart.items.push({
          productId,
          quantity: 1,
          price: product.price,
          totalPrice: product.price,
        });
      }
    }

    // Save the cart and product (stock is updated separately if required)
    await cart.save();
    cart = await Cart.findOne({ userId })
    cartitemcount=cart.items.length
    res.status(200).json({ message: 'Product added to cart successfully!', cart,cartitemcount:cartitemcount });
  } catch (error) {
    console.error('Error adding product to cart:', error);
    res.status(500).json({ error: 'Failed to add product to cart.Please login again ' });
  }
};

  

  

const removeFromCart = async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: 'User not logged in' });
      }
  
      const { productId } = req.body;
      let cart = await Cart.findOne({ userId: req.session.user._id });
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
      cart = await Cart.findOne({ userId:req.session.user._id })
     let cartitemcount=cart.items.length
      res.status(200).json({ message: 'Product removed from cart',cartitemcount:cartitemcount });
    } catch (error) {
      console.error('Error removing product from cart:', error);
      res.status(500).json({ error: 'Failed to remove product from cart' });
    }
  };
  

// const updateCartQuantity = async (req, res) => {
//   try {let cartitemcount;
//     const user = req.session.user;
//     if (!user) {
//       return res.status(401).json({ error: "User not logged in" });
//     }

//     const { productId, quantity } = req.body;
//     if (!productId || quantity == null) {
//       return res.status(400).json({ error: "Product ID and quantity are required" });
//     }

//     let cart = await Cart.findOne({ userId:req.session.user._id });
//     if (!cart) {
//       return res.status(404).json({ error: "Cart not found" });
//     }

//     const item = cart.items.find((item) => item.productId.toString() === productId);
//     if (!item) {
//       return res.status(404).json({ error: "Product not found in cart" });
//     }

//     const product = await Product.findById(productId);
//     if (!product) {
//       return res.status(404).json({ error: "Product not found in inventory" });
//     }


//     // Update cart item
//     item.quantity = quantity;
//     item.totalPrice = item.quantity * item.price; // Recalculate total price based on new quantity

//     await cart.save(); // Save updated cart
//    // cart = await Cart.findOne({ userId:req.session.user._id })
//     console.log(cart)
//      cartitemcount=cart.items.length
//     res.status(200).json({ message: "Cart updated successfully",cart:cart.items ,cartitemcount:cartitemcount});
//   } catch (error) {
//     console.error("Error updating cart:", error);
//     res.status(500).json({ error: "Failed to update cart" });
//   }
// };

const updateCartQuantity = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    // Parse quantity as a number
    const parsedQuantity = parseInt(quantity);

    if (!productId || isNaN(parsedQuantity)) {
      return res.status(400).json({ error: "Product ID and valid quantity are required" });
    }

    const cart = await Cart.findOne({ userId: req.session.user._id });
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

    // Update quantity and recalculate total price
    item.quantity = parsedQuantity;
    item.totalPrice = parsedQuantity * product.price;

    await cart.save();

    // Calculate total items in the cart
    const cartitemcount = cart.items.reduce((total, item) => total + item.quantity, 0);

    res.status(200).json({
      newTotalPrice: item.totalPrice,quantity:item.quantity,
      cartitemcount,
    });
  } catch (error) {
    console.error("Error updating cart:", error);
    res.status(500).json({ error: "Failed to update cart", details: error.message });
  }
};





  
  const getCheckoutPage=async(req,res)=>{
    try {
      
   // Fetch the cart for the logged-in user
   const userId = req.session.user._id; // Ensure the user is authenticated
   //console.log(req.session,"user session")
   //console.log(userId)
   const carts = await Cart.findOne({ userId }).populate("items.productId");
  const address=await Address.find({userId})
  
  //console.log(address)
   if (!carts) {
     return res.render("checkout", { 
       captureEvents: { items: [], total: 0 }, // Empty cart fallback
       user: req.user ,
       address:address,
     });
   }

   // Calculate the total price (if not pre-calculated in DB)
   let total = 0;
   carts.items.forEach(item => {
     total += item.totalPrice;
   });

   // Render the checkout page with the cart data
   
   res.render("checkout", {
     carts,
     total,
     address:address,
     cart:carts.items,
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
    //  if(addressId){
    //   const addid=await Address.findById(addressId)
    //  }
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
            productId: product._id,
             quantity: item.quantity,
              price: product.price
          })
         
      }
      console.log(req.session.user._id,"sdadsfdsfsdfdsfsession")
const userId=req.session.user._id
      // Apply discount if any
      const finalAmount = totalPrice - (req.body.discount || 0);

      // Create the order
      const order = new Order({
        orderedItems:productitems,
      //  addressId:addressId,
        address:address,
          totalPrice,
          finalAmount,
          address:address,
          userId:userId,
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

   const success=  await Cart.findOneAndDelete({ userId:userId });
   const cartitem=await Cart.findOne({userId:userId})
if(success){
      res.status(200).json({success:true ,message: "Order placed successfully.", order ,cart:cartitem});
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