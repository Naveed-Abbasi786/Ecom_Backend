// middleware/upload.js
const multer = require('multer');
const path = require('path');


// Set storage engine
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    if (file.fieldname === 'profileImage') {
      cb(null, 'uploads/profiles/');
    } else if (file.fieldname === 'blogImages') {  
      cb(null, 'uploads/blogs/');
    } else if (file.fieldname === 'files') {
      cb(null, 'uploads/products/');
    } else if (file.fieldname === 'categoryImage') {
      cb(null, 'uploads/categories/');
    } else {
      cb(null, 'uploads/');
    }
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});


// Initialize upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit 
  fileFilter: (req, file, cb) => {
    // Check file type (optional)
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Error: File upload only supports the following filetypes - ' + filetypes);
    }
  }
});

// Export the upload middleware
module.exports = upload;
