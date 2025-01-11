const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  login,
  signup,
  otp,
  forgotPassword,
  resetPassword,
  getUserDetails,
} = require("../controllers/website/authController");
const upload = require("../middleware/upload");
const { updateUserProfile } = require("../controllers/website/authController");
const { body, validationResult } = require("express-validator");

// Auth routes with profile image upload
router.post(
  "/signup",
  upload.fields([{ name: "profileImage", maxCount: 1 }]),
  [
    body("email").isEmail().withMessage("Please enter a valid email"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  signup
);

// Other auth routes (no file upload needed)
router.post("/login", login);
router.post("/verify-otp", otp);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/user-details", authMiddleware, getUserDetails);
router.put("/user-profile", authMiddleware, updateUserProfile);

module.exports = router;
