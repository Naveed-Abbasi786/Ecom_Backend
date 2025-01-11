const mongoose = require('mongoose');
const Tag = require('../../models/tags');
const Blog = require('../../models/BlogModel');
const fs = require('fs');
const path = require("path");
const User = require('../../models/User')

// Create Blog
const createBlog = async (req, res) => {
  try {
    const { title, content, tags, author } = req.body;
    // Validate required fields
    if (!title || !content || !tags || !author) {
      // Clean up any uploaded files
      if (req.files) {
        req.files.forEach((file) => {
          fs.unlinkSync(file.path);
        });
      }
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Check if images were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one blog image is required",
      });
    }

    // Process multiple images
    const imagesPaths = req.files.map(
      (file) => `/uploads/${file.filename}`
    );

    let tagIds = [];

    if (Array.isArray(tags)) {
      // Determine if tags are ObjectIds or names
      const areObjectIds = tags.every(tag => mongoose.Types.ObjectId.isValid(tag));

      if (areObjectIds) {
        // Verify that each tag exists
        const existingTags = await Tag.find({ _id: { $in: tags } })
        if (existingTags.length !== tags.length) {
          return res.status(400).json({
            success: false,
            message: "One or more tags are invalid.",
          });
        }
        tagIds = tags;
      } else {
        // Tags are names; find or create them
        for (let tagName of tags) {
          tagName = tagName.trim().toLowerCase();
          if (!tagName) continue; // Skip empty strings
          let tag = await Tag.findOne({ name: tagName });
          if (!tag) {
            tag = await Tag.create({ name: tagName });
          }
          tagIds.push(tag._id);
        }
      }
    } else if (typeof tags === 'string') {
      // Tags provided as a comma-separated string
      const tagsArray = tags.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag);
      for (let tagName of tagsArray) {
        let tag = await Tag.findOne({ name: tagName });
        if (!tag) {
          tag = await Tag.create({ name: tagName });
        }
        tagIds.push(tag._id);
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Tags must be an array or a comma-separated string.",
      });
    }

    if (tagIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one valid tag is required.",
      });
    }

    const blog = await Blog.create({
      title,
      content,
      images: imagesPaths,
      tags: tagIds,
      author,
    });

    // Populate the response
    const populatedBlog = await Blog.findById(blog._id)
      .populate("author",  "name")
      .populate("tags", "name");

    res.status(201).json({
      success: true,
      message: "Blog created successfully",
      blog: populatedBlog,
    });
  } catch (error) {
    console.error('Error creating blog:', error);
    // Clean up uploaded files in case of error
    if (req.files) {
      req.files.forEach((file) => {
        fs.unlinkSync(file.path);
      });
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get All Blogs
const getBlogs = async (req, res) => {
  try {
      // Extract pagination parameters from query
      const { page = 1, limit = 10 } = req.query;

      // Initialize the query object
      let query = {};

      // Check the user's role
      // if (req.user.role !== 'admin') {
      //     // If not admin, filter blogs by the author's ID
      //     query.author = req.user._id;
      // }

      const blogs = await Blog.find(query)
          .populate({
              path: "author",
              select: "username email profileImage", // Specify the fields you want to include
          })
          .populate("tags", "name") // Optionally populate tags
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(parseInt(limit));

      // Get total count for pagination
      const total = await Blog.countDocuments(query);

      res.status(200).json({
          success: true,
          count: blogs.length,
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          blogs
      });
  } catch (error) {
      console.error("Error in getBlogs:", error);
      res.status(500).json({
          success: false,
          message: "Error fetching blogs",
          error: error.message
      });
  }
};

// Get Single Blog
const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.body.blogId)
      .populate({
        path: 'author',
        select: 'username profileImage email'
      })
      .populate('tags', 'name')
      .populate({
        path: 'comments.user',
        select: 'username profileImage email'
      })
      .populate({
        path: 'comments.replies.user',
        select: 'username profileImage email'
      })
      .populate({
        path: 'reviews.user',
        select: 'username profileImage email'
      });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    // Recursively populate nested replies
    const populateNestedReplies = async (replies) => {
      for (let reply of replies) {
        await User.populate(reply, {
          path: 'user',
          select: 'username profileImage email'
        });
        if (reply.replies && reply.replies.length > 0) {
          await populateNestedReplies(reply.replies);
        }
      }
    };

    // Populate nested replies for each comment
    for (let comment of blog.comments) {
      if (comment.replies && comment.replies.length > 0) {
        await populateNestedReplies(comment.replies);
      }
    }

    res.status(200).json({
      success: true,
      blog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update Blog
const updateBlog = async (req, res) => {
  try {
    const { blogId, title, content, tags } = req.body;

    const blog = await Blog.findById(blogId);
    if (!blog) {
      if (req.files) {
        req.files.forEach((file) => {
          fs.unlinkSync(file.path);
        });
      }
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    // Handle image updates
    if (req.files && req.files.length > 0) {
      // Delete old images if they exist
      blog.images.forEach((imagePath) => {
        const fullPath = path.join(__dirname, "../../", imagePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      });

      // Add new images
      blog.images = req.files.map((file) => `/uploads/blogs/${file.filename}`);
    }

    // Update other fields
    if (title) blog.title = title;
    if (content) blog.content = content;
    if (tags) blog.tags = tags;

    await blog.save();

    // Populate the response
    const updatedBlog = await Blog.findById(blog._id)
      .populate("author", "name")
      .populate("tags", "name");

    res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      blog: updatedBlog,
    });
  } catch (error) {
    if (req.files) {
      req.files.forEach((file) => {
        fs.unlinkSync(file.path);
      });
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Helper function to find nested reply
const findNestedReply = (replies, replyId) => {
  for (let reply of replies) {
    if (reply._id.toString() === replyId) {
      return reply;
    }
    if (reply.replies && reply.replies.length > 0) {
      const nestedReply = findNestedReply(reply.replies, replyId);
      if (nestedReply) return nestedReply;
    }
  }
  return null;
};

// Add Comment
const addComment = async (req, res) => {
  try {
    const { blogId, comment, userId } = req.body;

    if (!blogId || !comment || !userId) {
      return res.status(400).json({
        success: false,
        message: "BlogId, comment and userId are required",
      });
    }

    const blog = await Blog.findById(blogId);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    blog.comments.push({
      user: userId,
      comment,
      replies: [],
    });

    await blog.save();

    // Populate all nested user references with additional fields
    const updatedBlog = await Blog.findById(blogId)
      .populate({
        path: 'comments.user',
        select: 'username profileImage email'
      })
      .populate({
        path: 'comments.replies.user',
        select: 'username profileImage email'
      })
      .populate({
        path : 'comments.replies.replies.user',
        select : 'username profileImage email'
      })
      .populate({
        path : 'comments.replies.replies.replies.user',
        select : 'username profileImage email'
      })
      .populate({
        path : 'comments.replies.replies.replies.replies.user',
        select : 'username profileImage email'
      })
      .populate({
        path : 'comments.replies.replies.replies.replies.replies.user',
        select : 'username profileImage email'
      })
      .populate({
        path : 'comments.replies.replies.replies.replies.replies.replies.user',
        select : 'username profileImage email'
      })
      .populate({
        path : 'comments.replies.replies.replies.replies.replies.replies.replies.replies.user',
        select : 'username profileImage email'
      })
      .populate({
        path : 'author',
        select : 'username profileImage email'
      })
      
    res.status(200).json({
      success: true,
      message: "Comment added successfully",
      blog: updatedBlog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Add Reply (handles nested replies at any level)
const addReply = async (req, res) => {
  try {
    const { blogId, commentId, replyId, comment, userId } = req.body;

    if (!blogId || !comment || !userId) {
      return res.status(400).json({
        success: false,
        message: "BlogId, comment and userId are required",
      });
    }

    const blog = await Blog.findById(blogId);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    let targetComment;
    if (commentId) {
      targetComment = blog.comments.id(commentId);
      if (!targetComment) {
        return res.status(404).json({
          success: false,
          message: "Comment not found",
        });
      }
    }

    const newReply = {
      user: userId,
      comment: comment,
      replies: [],
    };

    if (replyId) {
      const parentReply = findNestedReply(targetComment.replies, replyId);
      if (!parentReply) {
        return res.status(404).json({
          success: false,
          message: "Parent reply not found",
        });
      }
      parentReply.replies.push(newReply);
    } else {
      targetComment.replies.push(newReply);
    }

    await blog.save();

    // Populate all nested user references with additional fields
    const updatedBlog = await Blog.findById(blogId)
      .populate({
        path: 'comments.user',
        select: 'username profileImage email'
      })
      .populate({
        path: 'comments.replies.user',
        select: 'username profileImage email'
      })
      .populate({
        path : 'comments.replies.replies.user',
        select : 'username profileImage email'
      }).populate({
        path : 'comments.replies.replies.replies.user',
        select : 'username profileImage email'
      })
      .populate({
        path : 'comments.replies.replies.replies.replies.user',
        select : 'username profileImage email'
      })
      .populate({
        path : 'comments.replies.replies.replies.replies.replies.user',
        select : 'username profileImage email'
      }).populate({
        path : 'author',
        select : 'username profileImage email'
      })

    // Recursively populate nested replies
    const populateNestedReplies = async (replies) => {
      for (let reply of replies) {
        await User.populate(reply, {
          path: 'user',
          select: 'username profileImage email'
        });
        if (reply.replies && reply.replies.length > 0) {
          await populateNestedReplies(reply.replies);
        }
      }
    };

    // Populate nested replies for each comment
    for (let comment of updatedBlog.comments) {
      if (comment.replies && comment.replies.length > 0) {
        await populateNestedReplies(comment.replies);
      }
    }

    res.status(200).json({
      success: true,
      message: "Reply added successfully",
      blog: updatedBlog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Add Review
const addReview = async (req, res) => {
  try {
    const { blogId, rating, review, userId } = req.body;

    if (!blogId || !rating || !review || !userId) {
      return res.status(400).json({
        success: false,
        message: "BlogId, rating, review and userId are required",
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    const blog = await Blog.findById(blogId);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    blog.reviews.push({
      user: userId,
      rating,
      review,
    });

    const totalRating = blog.reviews.reduce(
      (sum, item) => sum + item.rating,
      0
    );
    blog.averageRating = totalRating / blog.reviews.length;

    await blog.save();
    res.status(200).json({
      success: true,
      message: "Review added successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete Blog
const deleteBlog = async (req, res) => {
  try {
    const { blogId } = req.body;

    const blog = await Blog.findById(blogId);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    // Optionally, delete associated images from the server
    blog.images.forEach((imagePath) => {
      const fullPath = path.join(__dirname, "../../", imagePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    });

    await Blog.findByIdAndDelete(blogId);

    res.status(200).json({
      success: true,
      message: "Blog deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Toggle Blog Status
const toggleBlogStatus = async (req, res) => {
  try {
    const { blogId } = req.body;

    const blog = await Blog.findById(blogId);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    // Toggle the isPublished status
    blog.isPublished = !blog.isPublished;
    await blog.save();

    res.status(200).json({
      success: true,
      message: `Blog status updated to ${
        blog.isPublished ? "public" : "private"
      }`,
      blog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};




module.exports = {
  createBlog,
  getBlogs,
  getBlogById,
  updateBlog,
  addComment,
  addReview,
  addReply,
  deleteBlog,
  toggleBlogStatus,
};
