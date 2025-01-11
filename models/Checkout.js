const mongoose = require('mongoose');
const slugify = require('slugify');

const checkoutSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    slug: {
        type: String,
        unique: true
    },
    email: {
        type: String,
        required: true
    },
    contactNumber: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    zipCode: {
        type: String,
    },
    billingAddress: {
        type: String,
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['Bank Transfer', 'EasyPaisa', 'JazzCash', 'Cash on Delivery'],
        required: true
    },
    products: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true
        }
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    orderStatus: {
        type: String,
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
        default: 'Pending'
    }
}, {
    timestamps: true
});

// Add pre-save middleware for slug generation
checkoutSchema.pre('save', async function(next) {
    if (!this.isModified('name')) return next();

    // Generate initial slug from name and timestamp
    const timestamp = new Date().getTime();
    let slug = slugify(`${this.name}-${timestamp}`, { 
        lower: true, 
        strict: true 
    });
    let uniqueSlug = slug;
    let count = 1;

    // Check for unique slug and append a counter if it already exists
    while (await mongoose.models.Checkout.findOne({ 
        slug: uniqueSlug,
        _id: { $ne: this._id } // Exclude current document when updating
    })) {
        uniqueSlug = `${slug}-${count}`;
        count++;
    }

    this.slug = uniqueSlug;
    next();
});

module.exports = mongoose.model('Checkout', checkoutSchema);