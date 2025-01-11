const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const authMiddleware = require('../middleware/authMiddleware');
const { 
    createBlog, 
    getBlogs, 
    getBlogById, 
    updateBlog, 
    addComment, 
    addReview, 
    addReply
} = require('../controllers/Blog/blogController');

router.use(authMiddleware);
// Update the field name to match what's being sent from frontend
// router.post('/create', upload.array('images', 5), createBlog);  
// router.post('/update', upload.array('images', 5), updateBlog); 


router.get('/blogs', getBlogs); 
router.post('/', getBlogById);
router.post('/comment', addComment);
router.post('/comment/reply', addReply); 
router.post('/review', addReview);

module.exports = router;