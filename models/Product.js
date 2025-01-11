const mongoose = require("mongoose");
const slugify = require('slugify');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, unique: true},
  imageUrls: [{ type: String }],
  heading: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },               
  discount: { type: Number, default: 0,min: [0, 'Discount cannot be less than 1'], max:  [99, 'Discount cannot be more than 99']},                 
  discountedPrice: { type: Number, default: 0},                      
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true }, 
  subCategory: { type: mongoose.Schema.Types.ObjectId, ref: "Subcategory", required: true },
  quantity: { type: Number, required: true, default: 0, min: 0 },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  isPublic: { type: Boolean, default: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, {
  timestamps: true
});

// Add pre-save middleware for slug generation
productSchema.pre('save', async function(next) {
  if (!this.isModified('name') && !this.isModified('heading')) return next();

  // Generate initial slug from name and heading
  let baseSlug = `${this.name}-${this.heading}`;
  let slug = slugify(baseSlug, { 
      lower: true, 
      strict: true,
      trim: true
  });
  let uniqueSlug = slug;
  let count = 1;

  // Check for unique slug and append a counter if it already exists
  while (await mongoose.models.Product.findOne({ 
      slug: uniqueSlug,
      _id: { $ne: this._id } // Exclude current document when updating
  })) {
      uniqueSlug = `${slug}-${count}`;
      count++;
  }

  this.slug = uniqueSlug;
  next();
});

module.exports = mongoose.model("Product", productSchema);
