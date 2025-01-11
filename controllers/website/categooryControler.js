const Category = require('../../models/Category');
const Subcategory = require('../../models/Subcategory');

// Create a new category (Admin only)
const createCategory = async (req, res) => {
    try {
        // Check if admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only admins can create categories'
            });
        }

        const { name } = req.body;
        console.log(name)
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Category name is required'
            });
        }

        // Handle category image
        let imagePath = '';
        if (req.file) {
            imagePath = `/uploads/categories/${req.file.filename}`;
        }

        const newCategory = new Category({ name, image: imagePath, subCategories: [] });
        await newCategory.save();

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            category: newCategory
        });
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating category',
            error: error.message
        });
    }
};

// Get all categories (Public)
const getCategories = async (req, res) => {
    try {
        const categories = await Category.find({})
            .populate('subCategories', 'name slug')

        res.status(200).json({
            success: true,
            categories
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching categories',
            error: error.message
        });
    }
};

// Update a category (Admin only)
const updateCategory = async (req, res) => {
    try {
        const { categoryId, name } = req.body;

        if (!categoryId || !name) {
            return res.status(400).json({
                success: false,
                message: 'Category ID and name are required'
            });
        }

        // Check if admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only admins can update categories'
            });
        }

        const updatedCategory = await Category.findByIdAndUpdate(
            categoryId,
            { name },
            { new: true, runValidators: true }
        ).populate('subCategories', 'name slug');

        if (!updatedCategory) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Category updated successfully',
            category: updatedCategory
        });
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating category',
            error: error.message
        });
    }
};

// Delete a category (Admin only)
const deleteCategory = async (req, res) => {
    try {
        // Check if admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only admins can delete categories'
            });
        }

        const { categoryId } = req.body;
        console.log(categoryId)
        if (!categoryId) {
            return res.status(400).json({
                success: false,
                message: 'Category ID is required'
            });
        }

        // Delete all subcategories first
        await Subcategory.deleteMany({ category: categoryId });

        // Then delete the category
        const deletedCategory = await Category.findByIdAndDelete(categoryId);

        if (!deletedCategory) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Category and all its subcategories deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting category',
            error: error.message
        });
    }
};

// Add a subcategory (Admin only)
const addSubCategory = async (req, res) => {
    try {
        // Check if admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only admins can add subcategories'
            });
        }

        const { categoryId, name } = req.body;

        if (!categoryId || !name) {
            return res.status(400).json({
                success: false,
                message: 'Category ID and name are required'
            });
        }

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        const subCategory = new Subcategory({ name, category: categoryId });
        await subCategory.save();

        category.subCategories.push(subCategory._id);
        await category.save();

        res.status(201).json({
            success: true,
            message: 'Subcategory added successfully',
            subCategory
        });
    } catch (error) {
        console.error('Error adding subcategory:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding subcategory',
            error: error.message
        });
    }
};

// Get subcategories (Public)
const getSubcategories = async (req, res) => {
    try {
        const { categoryId } = req.body;

        if (!categoryId) {
            return res.status(400).json({
                success: false,
                message: 'Category ID is required'
            });
        }

        const subcategories = await Subcategory.find(
            { category: categoryId },
            'name slug'
        );

        res.status(200).json({
            success: true,
            subcategories
        });
    } catch (error) {
        console.error('Error fetching subcategories:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching subcategories',
            error: error.message
        });
    }
};

const getAllSubCategories = async (req , res) =>{
    try {
        const subCategorirs = await Subcategory.find({}).sort({ createdAt: -1 }).populate('category', 'name slug')

        res.status(200).json({
            success : true, 
            subCategorirs
        })
    } catch (error) {
        return res.status(500).json({
            success : false, 
            message: 'Error fetching subcategories',
            error : error.message
        })
    }
}

// Update a subcategory (Admin only)
const updateSubcategory = async (req, res) => {
    try {
        const {subcategoryId, name, newCategoryId} = req.body

        if(!subcategoryId || !name){
            return res.status(400).json({
                success : false, 
                message : 'Subcategory ID and name are required'
            })
        }

        if(req.user.role !== 'admin'){
            return res.status(403).json({
                success : false, 
                message : 'Only admins can update subcategories'
            })
        }

        const subcategory = await Subcategory.findById(subcategoryId)
        if(!subcategory){
            return res.status(404).json({
                success : false, 
                message : 'Subcategory not found'
            })
        }

        subcategory.name = name

        if(newCategoryId && newCategoryId !== subcategory.category.toString()){
            const newCategory = await Category.findById(newCategoryId);
            if(!newCategory){
                return res.status(404).json({
                    success : false, 
                    message : 'New category not found'
                })
            }

            const oldCategory = await Category.findById(subcategory.category)
            if(!oldCategory){
                return res.status(404).json({
                    success : false, 
                    message : 'Old category not found'
                })
            }

            oldCategory.subCategories = oldCategory.subCategories.filter(id => id.toString() !== subcategoryId)
            await oldCategory.save();

            newCategory.subCategories.push(subcategoryId)
            await newCategory.save()

            subcategory.category = newCategoryId
        }
        await subcategory.save()

        const updatedSubcategory = await Subcategory.findById(subcategoryId).populate('category', 'name slug')

        res.status(200).json({
            success : true, 
            message : 'Subcategory updated successfully',
            subcategory : updatedSubcategory,
        })

        // const { categoryId, subcategoryId, name } = req.body;

        // if (!categoryId || !subcategoryId || !name) {
        //     return res.status(400).json({
        //         success: false,
        //         message: 'Category ID, subcategory ID, and name are required'
        //     });
        // }

        // // Check if admin
        // if (req.user.role !== 'admin') {
        //     return res.status(403).json({
        //         success: false,
        //         message: 'Only admins can update subcategories'
        //     });
        // }

        // // Verify category and subcategory relationship
        // const category = await Category.findById(categoryId);
        // if (!category) {
        //     return res.status(404).json({
        //         success: false,
        //         message: 'Category not found'
        //     });
        // }

        // if (!category.subCategories.includes(subcategoryId)) {
        //     return res.status(404).json({
        //         success: false,
        //         message: 'Subcategory not found in this category'
        //     });
        // }

        // const updatedSubcategory = await Subcategory.findByIdAndUpdate(
        //     subcategoryId,
        //     { name },
        //     { new: true, runValidators: true }
        // );

        // res.status(200).json({
        //     success: true,
        //     message: 'Subcategory updated successfully',
        //     subcategory: updatedSubcategory
        // });
    } catch (error) {
        console.error('Error updating subcategory:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating subcategory',
            error: error.message
        });
    }
};

// Delete a subcategory (Admin only)
const deleteSubcategory = async (req, res) => {
    try {
        // Check if admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only admins can delete subcategories'
            });
        }

        const { categoryId, subcategoryId } = req.body;

        if (!categoryId || !subcategoryId) {
            return res.status(400).json({
                success: false,
                message: 'Category ID and subcategory ID are required'
            });
        }

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Remove subcategory from category
        category.subCategories = category.subCategories.filter(
            sub => sub.toString() !== subcategoryId
        );
        await category.save();

        // Delete the subcategory
        await Subcategory.findByIdAndDelete(subcategoryId);

        res.status(200).json({
            success: true,
            message: 'Subcategory deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting subcategory:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting subcategory',
            error: error.message
        });
    }
};

module.exports = {
    createCategory,
    getCategories,
    updateCategory,
    deleteCategory,
    addSubCategory,
    getSubcategories,
    updateSubcategory,
    deleteSubcategory,
    getAllSubCategories
};