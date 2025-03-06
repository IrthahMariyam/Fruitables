
const Product= require('../../models/productSchema')
const Offer= require('../../models/offerSchema');
const Category = require('../../models/categorySchema');
const cron = require('node-cron');

const getOfferPage = async (req, res) => {
    try {
       console.log("insidepage")
        const page = parseInt(req.query.page) || 1;
        const limit = 10; 

       
        const totalOffers = await Offer.countDocuments();
        const totalPages = Math.ceil(totalOffers / limit);

      
        const offers = await Offer.find()
        .lean()
         
            .skip((page - 1) * limit)
            .limit(limit);
            
            const populatedOffers = await Promise.all(offers.map(async (offer) => {
                if (offer.applicableType === 'category') {
                    offer.applicableItems = await Category.find({
                        _id: { $in: offer.applicableItems }
                    }).select('name _id');
                } if (offer.applicableType === 'product') {
                    offer.applicableItems = await Product.find({
                        _id: { $in: offer.applicableItems }
                    }).select('productName _id');

                   
                }
                return offer;
            }));

           
        const products = await Product.find();
        const categories = await Category.find();

        
        res.render('admin-offer', { 
            products, 
            categories, 
            offers: populatedOffers, 
            currentPage: page, 
            totalPages 
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
    }
};


// create offers
const createOffer = async (req, res) => {
   
console.log("inside req c1")
    try {
        const { offerName, offerDescription, discountAmount, applicableType, selectedItems, startDate, endDate } = req.body;
       console.log("offercreation",req.body)
        if (!offerName || !offerDescription || !discountAmount || 
            !applicableType || !selectedItems || !startDate || !endDate) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }

        if (!Array.isArray(selectedItems) || selectedItems.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: `Please select at least one ${applicableType}` 
            });
        }

        const existingOffer = await Offer.findOne({ name: offerName.toUpperCase() });
        
        if (existingOffer) {
         
            return res.status(400).json({ success: false, message: 'Offer name already used!' });
        }
       

        // Create a new offer
        const offer = new Offer({
            name: offerName.toUpperCase(),
            description: offerDescription,
            discount: discountAmount,
            applicableType,
            applicableItems: selectedItems,
            startDate,
            endDate
        });
        console.log("inside offfer",offer)
        // Save the offer to the database
        const savedOffer = await offer.save();

       
        if (applicableType == 'category') {
            try {
                // Find categories by their IDs
                const categories = await Category.find({ _id: { $in: selectedItems } });
        console.log("category=",categories.name)
                if (categories.length > 0) {
                    console.log("tyuio")
                    // Update category offer and store offer ID
                    await Category.updateMany(
                        { _id: { $in: selectedItems } },
                        { 
                            $set: { categoryOffer: discountAmount,offer: savedOffer._id },
                           // $addToSet: { offer: savedOffer._id }
                        }
                    );
                    console.log('Categories updated successfully');
                }
            } catch (error) {
                console.error('Error updating categories:', error);
                throw error;
            }
        } if (applicableType == 'product') {
            try {
                // Update products
                const result = await Product.updateMany(
                    { _id: { $in: selectedItems } },
                    { 
                        $set: { productOffer: discountAmount ,offer: savedOffer._id},
                     //   $addToSet: { offer: savedOffer._id }
                    }
                );
                console.log('Products updated successfully:', result);
            } catch (error) {
                console.error('Error updating products:', error);
                throw error;
            }
        }


        await handleOfferChange(savedOffer._id);
      
      
        res.status(201).json({ success: true, message: "Offer created successfully!" });
    } catch (error) {
        console.error('Error creating offer:', error);
        res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
    }
};

const updateOffer = async (req, res) => {
    try {
        console.log("inside updateOffer",req.body);
        const { offerId, name, description, discount, applicableType, applicableItems, startDate, endDate } = req.body;

        if (!offerId || !name || !description || !discount || !applicableType || !applicableItems || !startDate || !endDate) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        if (!Array.isArray(applicableItems) || applicableItems.length === 0) {
            return res.status(400).json({ success: false, message: `Please select at least one ${applicableType}` });
        }

        const existingOffer = await Offer.findById(offerId);
        if (!existingOffer) {
            return res.status(404).json({ success: false, message: 'Offer not found!' });
        }

        // Remove the offer from old applicable categories or products
        if (existingOffer.applicableType === 'category') {
            await Category.updateMany(
                { _id: { $in: existingOffer.applicableItems } },
                { 
                    $set: { categoryOffer: 0 }, // Reset previous discount
                    $unset:  { offer: 1 } 
                   // $unset: { offer: existingOffer._id }
                }
            );
           
        } if (existingOffer.applicableType ==='product') {
            await Product.updateMany(
                { _id: { $in: existingOffer.applicableItems } },
                { 
                    $set: { productOffer: 0 }, // Reset previous discount
                    $unset:  { offer: 1 } 
                  
                }
            );
        }

        // Update the offer
        const updatedOffer = await Offer.findByIdAndUpdate(offerId, {
            name: name.toUpperCase(),
            description: description,
            discount: discount,
            applicableType,
            applicableItems: applicableItems,
            startDate,
            endDate
        }, { new: true });

        console.log("updatedOffer", updatedOffer);

        // Apply the updated offer to new applicable categories or products
        if (applicableType === 'category') {
            await Category.updateMany(
                { _id: { $in: applicableItems } },
                { 
                    $set: { categoryOffer: discount, offer: updatedOffer._id },
                   // $addToSet: { offer: updatedOffer._id }
                }
            );
           
        } if (applicableType === 'product') {
            await Product.updateMany(
                { _id: { $in: applicableItems } },
                { 
                    $set: { productOffer: discount ,offer: updatedOffer._id },
                   // $addToSet: { offer: updatedOffer._id }
                }
            );
        }
        await handleOfferChange(offerId);
        res.status(200).json({ success: true, message: 'Offer updated successfully!', offer: updatedOffer });
    } catch (error) {
        console.log('Error updating offer:', error);
        res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
    }
};

// active and deactivate function 
const activateOffer= async(req,res)=>{
    const offerId = req.params.id;
    
    try {
        // Find the offer by ID
        const offer = await Offer.findById(offerId);
        if (!offer) {
            return res.status(404).json({ success: false, message: 'Offer not found' });
        }

        // Toggle the isActive status
        offer.isActive = !offer.isActive;

        // Save the updated offer
        await offer.save();
        await handleOfferChange(offerId);
        // Respond with the new status
        res.json({ success: true, isActive: offer.isActive });
    } catch (error) {
        console.error('Error toggling offer status:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}


const deactivateOffer= async(req,res)=>{
  
    try {
        const offerId= req.params.id;
        await Offer.findByIdAndUpdate(offerId,{isActive:false})
        await handleOfferChange(offerId);
        res.json({ success: true, message: 'Offer deactivated successfully.' });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: 'Failed to deactivate offer.' });
    }
}

///////////////////////////////////

async function updateProductSalesPrice(productId) {
    try {
        console.log(`Updating sales price for product: ${productId}`);
        
        // Get the product without relying on populate
        const product = await Product.findById(productId);
        
        if (!product) {
            console.log(`Product not found: ${productId}`);
            throw new Error('Product not found');
        }
        
        console.log(`Product fetched:`, product.productName || product._id);
        
        const currentDate = new Date();
        let bestDiscount = 0;
        let originalPrice = product.price;
        console.log(`Original price: ${originalPrice}`);
        
        // Get product offer if exists
        if (product.offer) {
            const productOffer = await Offer.findById(product.offer);
            if (productOffer && productOffer.isActive && 
                productOffer.startDate <= currentDate && 
                productOffer.endDate >= currentDate) {
                bestDiscount = productOffer.discount;
                console.log(`Product offer applied: ${bestDiscount}%`);
            }
        }
        
        // Get category offer if exists
        if (product.category) {
            const category = await Category.findById(product.category);
            if (category && category.offer) {
                const categoryOffer = await Offer.findById(category.offer);
                if (categoryOffer && categoryOffer.isActive && 
                    categoryOffer.startDate <= currentDate && 
                    categoryOffer.endDate >= currentDate) {
                    const categoryDiscount = categoryOffer.discount;
                    console.log(`Category offer found: ${categoryDiscount}%`);
                    // Use whichever discount is greater
                    bestDiscount = Math.max(bestDiscount, categoryDiscount);
                    console.log(`Best discount after comparing: ${bestDiscount}%`);
                }
            }
        }

        // Calculate new sales price
        const newSalesPrice = bestDiscount > 0 
            ? originalPrice - Math.round(originalPrice * (bestDiscount / 100))
            : originalPrice;
        
        console.log(`New sales price: ${newSalesPrice}`);
        
        // Update the product's sales price
        const updatedProduct = await Product.findByIdAndUpdate(
            productId, 
            {
                salesPrice: newSalesPrice,
                productOffer: bestDiscount
            },
            { new: true }  // Return the updated document
        );
        
        if (updatedProduct) {
            console.log(`Sales price updated for product: ${productId} to ${newSalesPrice}`);
        } else {
            console.log("Product not updated - findByIdAndUpdate returned null");
        }
        
        return {
            success: true,
            newSalesPrice,
            appliedDiscount: bestDiscount
        };
    } catch (error) {
        console.error('Error updating product sales price:', error);
        throw error;
    }
}



// Function to update offers when changes are made
async function handleOfferChange(offerId) {
    try {
        console.log(`Handling offer change for: ${offerId}`);
        const offer = await Offer.findById(offerId);
        if (!offer) {
            console.log(`Offer not found: ${offerId}`);
            throw new Error('Offer not found');
        }
        console.log(`Offer details:`, offer);
        // If it's a category offer, update all products in that category
        if (offer.applicableType === 'category') {
            const products = await Product.find({
                category: { $in: offer.applicableItems }
            });
            console.log(`Found ${products.length} products in affected categories`);
            for (const product of products) {
                await updateProductSalesPrice(product._id);
            }
        } 
        // If it's a product offer, update those specific products
        else if (offer.applicableType === 'product') {
            console.log(`Updating ${offer.applicableItems.length} directly affected products`);
            for (const productId of offer.applicableItems) {
                console.log(`Updating product: ${productId}`);
                await updateProductSalesPrice(productId);
            }
        }
        console.log(`Offer change handled successfully`);
        return {
            success: true,
            message: 'Offers updated successfully'
        };
    } catch (error) {
        console.error('Error handling offer change:', error);
        throw error;
    }
}


cron.schedule('0 0 * * *', async () => {
    console.log('Running daily offer update check');
    try {
        const products = await Product.find();
        console.log(`Checking offers for ${products.length} products`);
        for (const product of products) {
            await updateProductSalesPrice(product._id);
        }
        console.log('Daily offer update completed successfully');
    } catch (error) {
        console.error('Error in daily offer update:', error);
    }
});

// After saving a new offer or updating an existing one
//await handleOfferChange(savedOffer._id);

module.exports={
    getOfferPage,
    createOffer,
    updateOffer,
    activateOffer,
    deactivateOffer,
    //
    updateProductSalesPrice,
    handleOfferChange
}

