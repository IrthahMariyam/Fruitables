module.exports = {
    STATUS: {
        SUCCESS: 200,
        CREATED: 201,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        SERVER_ERROR: 500
    },

    MESSAGES: {
        PRODUCT_DELETE:'Product  deleted successfully',
        IMAGE_DELETE:'Image deleted successfully',
        FIELD_REQUIRED:"All fields are required.",
        START_DATE:"Start date must be in the future.",
        END_DATE:"End date must be after the start date.",
        MIN_PRICE:"Minimum price must be greater than 100.",
        DISCOUNT_RANGE:"Discount must be between 1 and 70.",

        LOGIN_FAILED: "Invalid email or password",
        SESSION_DESTROY_ERROR: "Error destroying session",
        LOGOUT_ERROR:"Logout error",
        
        CATEGORY_EXISTS: "Category already exists",
        CATEGORY_ADDED: "Category added successfully",
        CATEGORY_UPDATED: "Category updated successfully",
        CATEGORY_NOT_UPDATED: "Category not updated",
        CATEGORY_DELETED: "Category soft deleted successfully",
        INTERNAL_ERROR: "Internal Server Error",

        COUPON_EXISTS: "Coupon code already exists.",
        COUPON_ADDED: "Coupon added successfully.",
        COUPON_UPDATED: "Coupon updated successfully.",
        COUPON_DELETED: "Coupon deleted successfully.",
        INVALID_INPUT: "Invalid input data.",
        COUPON_NOT_FOUND: "Coupon not found.",

        SERVER_ERROR: 'Server error. Please try again later.',
        OFFER_EXISTS: 'Offer name already used!',
        OFFER_NOT_FOUND: 'Offer not found!',
        ALL_FIELDS_REQUIRED: 'All fields are required',
        SELECT_AT_LEAST_ONE: (type) => `Please select at least one ${applicableType}`,
        OFFER_CREATED: 'Offer created successfully!',
        OFFER_UPDATED: 'Offer updated successfully!',
        OFFER_DEACTIVATED: 'Offer deactivated successfully.',
        OFFER_NOT_FOUND: "Offer not found",
        OFFER_ACTIVATED: "Offer activated successfully",
        OFFER_DEACTIVATED: "Offer deactivated successfully",
        OFFER_NAME_EXISTS: "Offer name already used!",

        PRODUCT_NAME_MISSING: "Product name not received. Try with another name.",
        PRODUCT_EXISTS: "Product already exists. Try with another name.",
        NO_IMAGES: "No images uploaded.",
        INVALID_CATEGORY: "Invalid category name.",
        PRODUCT_ADDED: "Product added successfully!",
        SERVER_ERROR: "Internal server error. Please try again later.",

        INVALID_FILTER: "Invalid filter option.",
        FETCH_ERROR: "Error fetching data.",
        TOP_CATEGORIES_ERROR: "Error fetching top categories.",

        INTERNAL_SERVER_ERROR: "Internal Server Error",
        ORDER_NOT_FOUND: "Order not found!",
        PRODUCT_NOT_FOUND: "Product not found in the order.",
        PRODUCT_NOT_IN_DB: "Product not found in database.",
        STATUS_UPDATED: "Status updated successfully",
        RETURN_REQUEST_PENDING: "This product does not have a pending return request.",
        PAID_ORDERS_SHIP: "Only paid orders can be shipped for online payments.",
        REFUND_PROCESSED: "Refund for order processed.",
        RETURN_DECLINED: "Your Return request is declined",
        RETURN_DECLINE_FAILED: "Failed to process return decline.",
        ORDER_DETAILS_ERROR: "Error fetching order details.",
   
        INVALID_FILTER: "Invalid filter option",
        ERROR_FETCHING_TOP_CATEGORIES: "Error fetching top categories",
        ERROR_FETCHING_CANCELLED_ORDERS: "Error fetching cancelled/returned orders report",
   
        USER_NOT_FOUND: "User not found",
        USER_BLOCKED: "User blocked successfully",
        USER_UNBLOCKED: "User unblocked successfully",
        USER_LISTED: "User listed successfully",
        USER_UNLISTED: "User unlisted successfully",
        SERVER_ERROR: "Internal Server Error",

//user
NOT_LOGGED_IN: "User not logged in. Please log in first.",
PRODUCT_NOT_FOUND: "Product not found",
PRODUCT_RECIEVED:"Product name not recived. Try with another name.",
PRODUCT_NOT_LISTED: "Product not found in inventory",
PRODUCT_OUT_OF_STOCK: "This product is out of stock",
CART_NOT_FOUND: "Cart not found",
PRODUCT_ALREADY_IN_CART: "Product already in cart",
PRODUCT_ADDED_TO_CART: "Product added to cart successfully!",
PRODUCT_REMOVED_FROM_CART: "Product removed from cart",
CART_UPDATE_FAILED: "Failed to update cart",
CART_LOAD_ERROR: "An error occurred while loading the cart page",
CART_SAVE_ERROR: "Failed to save cart",
INVALID_QUANTITY: "Product ID and valid quantity are required",
USER_BLOCKED:'Blocked user successfully',
USER_LOGIN:"User not logged in",
        NOT_LOGGED_IN: "User not logged in",
        COUPON_REQUIRED: "Coupon code and total amount are required",
        INVALID_AMOUNT: "Invalid total amount",
        USER_NOT_FOUND: "User not found",
        INVALID_COUPON: "Invalid coupon code",
        COUPON_EXPIRED: "Coupon has expired",
        MIN_PURCHASE_REQUIRED: (minPrice) => `Minimum purchase of ₹${minPrice} required`,
        COUPON_ALREADY_USED: "Coupon already used",
        COUPON_APPLIED: "Coupon applied successfully",
        COUPON_APPLY_FAILED: "Failed to apply coupon",
        COUPON_REMOVED: "Coupon removed successfully",
        COUPON_REMOVE_FAILED: "Failed to remove coupon",
        CART_NOT_FOUND: "Cart not found",


        ORDER_NOT_FOUND: "Order not found.",
        UNAUTHORIZED_ACTION: "Unauthorized action.",
        INVALID_ORDER: "Invalid order request.",
        SUCCESS: "Operation successful.",
        ERROR: "An error occurred. Please try again.",
        

    USER_BLOCKED: "User blocked by admin",
    UNAUTHORIZED: "User not authenticated",
    ORDER_CREATION_FAILED: "Failed to create order",
    PAYMENT_VERIFICATION_FAILED: "Payment verification failed!",
    INVALID_AMOUNT: "Invalid amount specified.",
    WALLET_UPDATED: "Money added to wallet successfully!",
    WALLET_ERROR: "An error occurred while updating the wallet balance.",
    SERVER_ERROR: "Internal Server Error!",
    INSUFFICIENT_BALANCE: "Insufficient wallet balance!",
    PURCHASE_SUCCESS: "Purchase successful using wallet!",

    LOGIN_REQUIRED: "Please login to add a product to wishlist",
    PRODUCT_ID_REQUIRED: "Product ID is required",
    PRODUCT_NOT_FOUND: "Product not found",
    PRODUCT_ALREADY_IN_WISHLIST: "Product already in wishlist",
    WISHLIST_ADDED: "Product successfully added to wishlist",
    WISHLIST_NOT_FOUND: "Wishlist not found",
    PRODUCT_NOT_IN_WISHLIST: "Product not found in wishlist",
    PRODUCT_NOT_IN_INVENTORY: "Product not found in inventory",
    PRODUCT_REMOVED_FROM_WISHLIST: "Product removed from wishlist",
    WISHLIST_FETCH_ERROR: "An error occurred while loading the wishlist page.",
    REMOVE_WISHLIST_ERROR: "Failed to remove product from wishlist",
    LOGIN_REQUIRED_CART: "Please Login to add a product",
    OUT_OF_STOCK: "This product is out of stock",
    PRODUCT_ALREADY_IN_CART: "Product already added in cart!",
    PRODUCT_ADDED_TO_CART: "Product added to cart successfully!",
    ADD_TO_CART_ERROR: "Failed to add product to cart. Please login again",    
        VALID_STATUS_CODE:"Not a valid status code",
      FAILED_STATUS:"Failed to update status",
    FAILED_REQUEST:"Failed to process return request.",
          INSUFFICIENT_STOCK: 'Insufficient stock to add to cart' ,
      CANNOT_ADD_MORE:'You cannot add more than 5 units of this product' ,
      PRODUCT_NOT_IN_CART:"Product not found in cart",
      PRODUCT_FOUND_INVENTORY:"'Product not found in inventory'",
      REMOVED_CART:"Product removed from cart",
      PRODUCT_REMOVAL_FAILED:'Failed to remove product from cart',
},

    PRODUCT_STATUS: {
        AVAILABLE: "Available",
        OUT_OF_STOCK: "Out of Stock",
        DISCONTINUED: "Discontinued"
    },

     OrderStatus : {
        DELIVERED: "Delivered",
        PROCESSING: "Processing",
        SHIPPING: "Shipping",
        OUT_FOR_DELIVERY: "Out for Delivery",
        CANCELLED: "Cancelled",
        RETURNED: "Returned",
        RETURN_REQUEST:"Return Request",
      },
      ORDER_STATUS : {
        PENDING: "pending",
        CANCELLED: "cancelled",
        RETURNED: "returned",
        DELIVERED: "delivered",
      },

};
