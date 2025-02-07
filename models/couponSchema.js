
const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  couponName: {
    type: String,
    required: true,
    trim: true,
  },
  startDate: {
    type: Date,
    required: true,
    validate: {
      validator: function (value) {
        return value > new Date();
      },
      message: "Start date must be in the future.",
    },
  },
  endDate: {
    type: Date,
    required: true,
    validate: {
      validator: function (value) {
        return value > this.startDate;
      },
      message: "End date must be after the start date.",
    },
  },
  minPrice: {
    type: Number,
    required: true,
    min: [0, "Minimum price must be positive."],
  },
  maxPrice: {
    type: Number,
    required: true,
    validate: {
      validator: function (value) {
        return value > this.minPrice;
      },
      message: "Maximum price must be greater than minimum price.",
    },
  },
  discount: {
    type: Number,
    required: true,
    min: [1, "Discount must be at least 1%."],
    max: [100, "Discount cannot exceed 100%."],
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
});

module.exports = mongoose.model("Coupon", couponSchema);
