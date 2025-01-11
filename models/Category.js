const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true,
        trim: true
    },
    slug: {
        type: String,
        unique: true
    },
    image: {
        type: String,
        required: false
    },
    subCategories: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Subcategory' 
    }]
}, {
    timestamps: true
});

// Add pre-save middleware for slug generation
categorySchema.pre('save', async function(next) {
    if (!this.isModified('name')) return next();

    // Generate initial slug from name
    let slug = slugify(this.name, { 
        lower: true, 
        strict: true 
    });
    let uniqueSlug = slug;
    let count = 1;

    // Check for unique slug and append a counter if it already exists
    while (await mongoose.models.Category.findOne({ 
        slug: uniqueSlug,
        _id: { $ne: this._id } // Exclude current document when updating
    })) {
        uniqueSlug = `${slug}-${count}`;
        count++;
    }

    this.slug = uniqueSlug;
    next();
});

module.exports = mongoose.model('Category', categorySchema);
