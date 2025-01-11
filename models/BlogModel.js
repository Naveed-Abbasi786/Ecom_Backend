const mongoose = require("mongoose");
const slugify = require('slugify')

// Helper Schema of reply section
const replySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    comment: {
        type: String,
        required: true
    },
    replies: [], 
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Self-reference for nested replies
replySchema.add({ replies: [replySchema] });

const blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        unique: true
    },
    content: {
        type: String,
        required: true
    },
    images: [{ 
        type: String,
        required: true
    }], 
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    tags: {
        type: [mongoose.Schema.Types.ObjectId],
        
        ref: "Tag",
        required: true
    },
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        comment: {
            type: String,
            required: true
        },
        replies: [replySchema],
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    reviews: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        review: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    averageRating: {
        type: Number,
        default: 0
    },
    isPublished: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});



// Add pre-save middleware for slug generation
blogSchema.pre('save', async function(next) {
    if (!this.isModified('title')) return next();

    // Generate initial slug from title
    let slug = slugify(this.title, { 
        lower: true, 
        strict: true 
    });
    let uniqueSlug = slug;
    let count = 1;

    // Check for unique slug and append a counter if it already exists
    while (await mongoose.models.Blog.findOne({ 
        slug: uniqueSlug,
        _id: { $ne: this._id } // Exclude current document when updating
    })) {
        uniqueSlug = `${slug}-${count}`;
        count++;
    }

    this.slug = uniqueSlug;
    next();
});

module.exports = mongoose.model("Blog", blogSchema);