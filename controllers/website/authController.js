const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../../models/User");
const crypto = require("crypto");
const sendEmail = require("../../send email/mailService");


// const login = async (req, res) => {
//   const { email, password } = req.body;
//   console.log(email, password);

//   try {
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(400).json({ message: "Invalid credentials" });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ message: "Invalid credentials" });
//     }

//     const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
//       expiresIn: "5d",
//     });

//     res.cookie('UserToken', token, {
//       httpOnly: true, 
//       secure: process.env.NODE_ENV === 'production', 
//       sameSite: 'Strict', 
//       maxAge: 5 * 24 * 60 * 60 * 1000,
//     });

//     // Send a success response
//     res.json({ message: "Login successful" });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error" });
//   }
// };
const login = async (req, res) => {
  const { email, password } = req.body;
  console.log(email, password);

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "5d",
    });

    // Set token as a cookie
    res.cookie('UserToken', token, {
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'Strict', 
      maxAge: 5 * 24 * 60 * 60 * 1000, // 5 days
    });

    // Send a success response with the token
    res.json({ message: "Login successful", token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};



/////// SIGNUP
const signup = async (req, res) => {
  const { username, email, password } = req.body;
  console.log(username, email, password);
  console.log('Files:', req.files); // Add this to debug file upload

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: "Username already exists" });
    }

    let profileImagePath = null;

    // Handle single profile image
    if (req.files && req.files.profileImage && req.files.profileImage[0]) {
      profileImagePath = `/uploads/profiles/${req.files.profileImage[0].filename}`;
      console.log('Profile image saved at:', profileImagePath);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email,
      password: hashedPassword,
      profileImage: profileImagePath,
    });

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    user.otp = otp;
    user.otpExpiration = Date.now() + 20 * 60 * 1000; // 20 minutes
    await user.save();



    // Custom HTML email template
    const htmlContent = `
      <div style="background-color: #f4f4f9; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #4a4e69;">Welcome to Your Application, ${username}!</h2>
        <p style="color: #22223b;">Thank you for signing up. Please use the OTP below to verify your email address:</p>
        <h3 style="color: #9a8c98;">Your OTP Code: <strong>${otp}</strong></h3>
        <p style="color: #4a4e69;">This code will expire in 5 minutes. If you did not request this, please ignore this email.</p>
        <a href="#" style="padding: 10px 20px; color: #ffffff; background-color: #c9ada7; text-decoration: none; border-radius: 5px;">Visit Our Site</a>
        <p style="color: #4a4e69; font-size: 12px; margin-top: 20px;">If you have any questions, feel free to reach out at support@example.com.</p>
      </div>
    `;

    // Send OTP email
    await sendEmail(email, "Your OTP Code", htmlContent);

    // Send response with token
    res.status(200).json({ 
      message: "Signup successful. OTP sent to your email.", 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

//////////////////// OTP
const otp = async (req, res) => {
  const { email, otp: enteredOtp } = req.body;
  console.log("Request body for OTP verification:", req.body);

  try {
    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.log("User not found");
      return res.status(404).json({ message: "User not found" });
    }

    console.log("User found:", user);

    if (!user.otp || !user.otpExpiration) {
      console.log("No OTP sent or OTP has been cleared.");
      return res
        .status(400)
        .json({ message: "No OTP sent or OTP has been cleared." });
    }

    console.log("Stored OTP:", user.otp);
    console.log("Entered OTP:", enteredOtp);
    console.log("Current Time:", Date.now());
    console.log("OTP Expiration Time:", user.otpExpiration);

    if (user.otp === enteredOtp && Date.now() < user.otpExpiration) {
      // OTP is valid
      user.verified = true;
      user.otp = undefined;
      user.otpExpiration = undefined;
      await user.save();

          // Generate JWT Token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
          expiresIn: "5d",
        });

        // Set token as a cookie
        res.cookie('UserToken', token, {
          httpOnly: true, 
          secure: process.env.NODE_ENV === 'production', 
          sameSite: 'Strict', 
          maxAge: 5 * 24 * 60 * 60 * 1000, // 5 days
        });
      return res.status(200).json({ 
        message: "OTP verified successfully",
        token
      });
    } else {
      console.log("Invalid or expired OTP");
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

const forgotPassword = async (req, res) => {
  const { email, origin } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get the user's last known origin if one is not provided in the request
    const resetOrigin = origin;
    if (!resetOrigin) {
      return res.status(400).json({ message: "Origin not specified" });
    }

    // Generate a unique reset token and expiration
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiration = Date.now() + 20 * 60 * 1000;
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiration;
    await user.save();

    // Construct the reset link with the correct origin
    const resetLink = `${resetOrigin}/reset-password?token=${resetToken}`;
    const htmlContent = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password. This link is valid for 10 minutes.</p>
        <a href="${resetLink}" style="color: #ffffff; background-color: #4CAF50; padding: 10px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>If you did not request a password reset, please ignore this email.</p>
      </div>
    `;

    // Send the email
    await sendEmail(email, "Password Reset Request", htmlContent);

    res.status(200).json({ message: "Password reset email sent" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Re set Password
const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  console.log(token, newPassword);
  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const getUserDetails = async (req, res) => {
  try {
    const user = req.user;

    if (!user.verified) {
      return res.status(403).json({ message: "User is not verified." });
    }
    const { username, email, profileImage, createdAt, _id, role } = user;
    res.status(200).json({ username, email, profileImage, createdAt, _id, role });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Toggle user active status (admin only)
const toggleUserStatus = async (req, res) => {
  try {
      const { userId } = req.body;

      // Check if the requesting user is admin
      if (req.user.role !== 'admin') {
          return res.status(403).json({
              success: false,
              message: "Only admins can toggle user status"
          });
      }

      // Find user and toggle status
      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({
              success: false,
              message: "User not found"
          });
      }

      // Prevent toggling admin users
      if (user.role === 'admin') {
          return res.status(403).json({
              success: false,
              message: "Cannot toggle admin user status"
          });
      }

      // Toggle the status
      user.isActive = !user.isActive;
      await user.save();

      // Send email notification to user
      const htmlContent = `
          <div style="padding: 20px; font-family: Arial, sans-serif;">
              <h2>Account Status Update</h2>
              <p>Your account has been ${user.isActive ? 'activated' : 'deactivated'} by an administrator.</p>
              ${user.isActive 
                  ? '<p>You can now log in to your account.</p>' 
                  : '<p>Please contact support if you think this is a mistake.</p>'
              }
          </div>
      `;

      await sendEmail(
          user.email,
          `Account ${user.isActive ? 'Activated' : 'Deactivated'}`,
          htmlContent
      );

      res.status(200).json({
          success: true,
          message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
          user: {
              _id: user._id,
              username: user.username,
              email: user.email,
              isActive: user.isActive
          }
      });

  } catch (error) {
      console.error('Error toggling user status:', error);
      res.status(500).json({
          success: false,
          message: "Error toggling user status",
          error: error.message
      });
  }
};

// Change user role (admin only)
const changeUserRole = async (req, res) => {
  try {
      const { userId, newRole } = req.body;

      // Validate new role
      if (!['user', 'admin'].includes(newRole)) {
          return res.status(400).json({
              success: false,
              message: "Invalid role specified"
          });
      }

      // Check if the requesting user is admin
      if (req.user.role !== 'admin') {
          return res.status(403).json({
              success: false,
              message: "Only admins can change user roles"
          });
      }

      // Find user and update role
      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({
              success: false,
              message: "User not found"
          });
      }

      // Prevent changing own role
      if (user._id.toString() === req.user._id.toString()) {
          return res.status(403).json({
              success: false,
              message: "Cannot change your own role"
          });
      }

      // Update role
      user.role = newRole;
      await user.save();

      // Send email notification to user
      const htmlContent = `
          <div style="padding: 20px; font-family: Arial, sans-serif;">
              <h2>Account Role Update</h2>
              <p>Your account role has been updated to: ${newRole}</p>
              <p>This change may affect your access levels within the system.</p>
              <p>If you think this is a mistake, please contact support.</p>
          </div>
      `;

      await sendEmail(
          user.email,
          'Account Role Updated',
          htmlContent
      );

      res.status(200).json({
          success: true,
          message: "User role updated successfully",
          user: {
              _id: user._id,
              username: user.username,
              email: user.email,
              role: user.role
          }
      });

  } catch (error) {
      console.error('Error changing user role:', error);
      res.status(500).json({
          success: false,
          message: "Error changing user role",
          error: error.message
      });
  }
};

const getAllUsers = async (req, res) => {
  try {
      const users = await User.find().select('-password');
      res.status(200).json({
          success: true,
          users
      });
  } catch (error) {
      res.status(500).json({
          success: false,
          message: "Error fetching users",
          error: error.message
      });
  }
};
// update user profile
const updateUserProfile = async (req, res) => {
  try {
      const { username, email } = req.body;
      const user = await User.findById(req.user._id);

      if (!user) {
          return res.status(404).json({ message: "User not found" });
      }

      user.username = username || user.username;
      user.email = email || user.email;

      await user.save();

      res.status(200).json({
          success: true,
          message: "Profile updated successfully",
          user
      });
  } catch (error) {
      res.status(500).json({
          success: false,
          message: "Error updating profile",
          error: error.message
      });
  }
};

module.exports = {
  signup,
  login,
  otp,
  forgotPassword,
  resetPassword,
  getUserDetails,
  toggleUserStatus,    // Add this
  changeUserRole,
  getAllUsers,
  updateUserProfile
};
