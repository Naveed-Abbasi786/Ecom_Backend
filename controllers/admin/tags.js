const Tag = require('../../models/tags')

const addTag = async(req, res) => {
    try{
        if(req.user.role !== 'admin'){
            return res.status(403).json({
                success: false, 
                message : " Admim access required to add a product"
            })
        }
        const {name} = req.body
        if(!name){
            return res.status(400).json({
                success : false,
                error : "Tag Name is required"
            })
        }
        const existingTag = await Tag.findOne({name});
        if(existingTag){
            return res.status(409).json({
                success : false,
                error : "Tag Already Exists"
            })
        }
        const newTag = await Tag.create({name});
        return res.status(201).json({
            error : false,
            data : newTag.name,
            message : "Tag createed Successfully"
        });
    }catch(error){
        return res.status(500).json({
            message: error.message
        })
    }
}

const deleteTag = async(req, res) => {
        const {id} = req.body;
    try{
        const tag = await Tag.findOneAndDelete(id);
        if(!tag){
            return res.status(404).json({
                success : true,
                message : "Tag not found"
            })
        }
        return res.status(200).json({
            success : true,
            message : "Tag deleted Successfully"
        })
    }catch(error){
        return res.status(500).json({
            success : true, 
            message : error.message
        })
    }
}

const getTags = async(req , res) => {
    try{
        const tags = await Tag.find()
            .sort({name : -1})
        return res.status(200).json({
            error : false,
            data : tags.map(tag=> ({
                value : tag._id,
                label : tag.name
            }))
        })
    }catch(error){
        return res.status(500).json({
            success : false,
            message : error.message
        })
    }
}

module.exports = {
    addTag,
    deleteTag,
    getTags
}