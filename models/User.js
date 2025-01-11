const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, "Username is required"],
        unique: true,
        trim: true,
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        trim: true,
        lowercase: true,
        validate: {
            validator: function(email) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            },
            message: "Please enter a valid email address",
        },
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: [6, "Password should be at least 6 characters"],
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    profileImage: {
        type: String,
    },
    otp: {
        type: String,
    },
    otpExpiration: {
        type: Date,
    },
    resetPasswordToken: {
        type: String,
        select: false, 
    },
    resetPasswordExpires: {
        type: Date,
        select: false,  
    },
    verified: {
        type: Boolean,
        default: false, 
    },
}, { timestamps: true });



module.exports = mongoose.model('User', userSchema);
