require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require('cors');
const mainRouter = require("./routes");
const cookieParser = require('cookie-parser');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Other middleware
app.use(errorHandler);

// Static folders for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/profiles', express.static(path.join(__dirname, 'uploads/profiles')));
app.use('/uploads/products', express.static(path.join(__dirname, 'uploads/products')));
app.use('/uploads/categories', express.static(path.join(__dirname, 'uploads/categories')));
app.use('/uploads/blogs', express.static(path.join(__dirname, 'uploads/blogs')));
app.use('/uploads/blogs/images', express.static(path.join(__dirname, 'uploads/blogs/images')));

// Routes
app.use("/api", mainRouter);
app.use(cookieParser());



// Connect to Database
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB:", err));

// Start the server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
