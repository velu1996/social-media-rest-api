const fs = require('fs');
const path = require('path');

const {validationResult} = require('express-validator');

const User = require('../models/user');
const Post = require('../models/post');
const io = require('../socket');

const { findByIdAndRemove } = require('../models/post');
const post = require('../models/post');

exports.getPosts = async (req,res,next)=>{
    const currentPage = req.query.page  ||  1;
    const perPage = 2;
    let totalItems;
    try{
    const count = await Post.find().countDocuments()
        totalItems = count;
    let posts = await Post.find()
        .populate('creator')
        .sort({createdAt:-1})
        .skip((currentPage-1)*perPage)
        .limit(perPage);
        res.status(200).json({message:'Posts fetched',posts:posts,totalItems:totalItems});
    }catch(err){
        if(!err.statusCode){
            err.statusCode=500;
        }
        next(err);
    }
};

exports.createPost = (req,res,next)=>{
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        const error = new Error('Validation failed, Incorrect data');
        error.statusCode=422;
        throw error;   
    }
    if(!req.file){
        const error = new Error('No image found');
        error.statusCode = 422;
        throw error;
    }
    const imageUrl = req.file.path.replace(/\\/g, "/");
    const title = req.body.title;
    const content = req.body.content;
    let creator;
    const post = new Post({
        title:title,
        content:content,
        imageUrl:imageUrl,
        creator:req.userId
    });
    post.save()
    .then(result=>{
        return User.findById(req.userId);
    })
    .then(user=>{
        creator=user;
        user.posts.push(post);
        return user.save()
    })
    .then(result=>{
        io.getIO().emit('Posts',{action:'create',post:{...post._doc,creator:{_id:req.userId,name:result.name}}});
        res.status(201).json({
            message:'post created successfully',
            post:post,
            creator:{
                _id:creator._id,
                name:creator.name
            }
        })
    })
    .catch(err=>{
        if(!err.statusCode){
            err.statusCode=500;
        }
        next(err);
    });
};

exports.getPost = (req,res,next)=>{
    const postId = req.params.postId;
    Post.findById(postId)
    .then(post=>{
        if(!post){
            const error = new Error('Could not find Post');
            errror.statusCode = 422;
            throw error;
        }
        res.status(200).json({message:'Post fetched',post:post});
    })
    .catch(err=>{
        if(!err.statusCode){
            err.statusCode=500;
        }
        next(err);
    });
};

exports.updatePost = (req,res,next)=>{
    const postId = req.params.postId;
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        const error = new Error('Validation failed, Incorrect data');
        error.statusCode=422;
        throw error;   
    }
    const title = req.body.title;
    const content = req.body.content;
    let imageUrl = req.body.image;
    if(req.file){
        imageUrl = req.file.path;
    }
    if(!imageUrl){
        const error = new Error('No file picked');
        error.statusCode=422;
        throw error;
    }
    Post.findById(postId)
    .populate('creator')
    .then(post=>{
        if(!post){
            const error = new Error('Could not find Post');
            errror.statusCode = 422;
            throw error;
        }
        if(post.creator.toString() !== req.userId){
            const error = new Error('Not Authorized');
            error.statusCode=403;
            throw error;   
        }
        if(imageUrl!==post.imageUrl){
            clearImage(post.imageUrl);
        }
        post.title = title;
        post.imageUrl = imageUrl;
        post.content = content;
        return post.save();
    })
    .then(result=>{
        io.getIO().emit('posts',{action:'update',post:result});
        res.status(200).json({message:'Updated successfully',post:result})
    })
    .catch(err=>{
        if(!err.statusCode){
            err.statusCode=500;
        }
        next(err);
    });
};

exports.deletePost = (req,res,next)=>{
    const postId = req.params.postId;
    Post.findById(postId)
    .populate('creator')
    .then(post=>{
        if(!post){
            const error = new Error('Could not find Post');
            errror.statusCode = 422;
            throw error;
        }
        if(post.creator.toString() !== req.userId){
            const error = new Error('Not Authorized');
            error.statusCode=403;
            throw error;   
        }
        clearImage(post.imageUrl);
        return Post.findByIdAndRemove(postId);
    })
    .then(result=>{
        return User.findById(req.userId);
    })
    .then(user=>{
        user.posts.pull(postId);
        user.save();
    })
    .then(result=>{
        io.getIO().emit('posts',{action:'delete',post:postId});
        res.status(422).json({message:'Deleted Post'});
    })
    .catch(err=>{
        if(!err.statusCode){
            err.statusCode=500;
        }
        next(err);
    });
};

exports.getStatus = (req,res,next)=>{
    User.findById(req.userId)
    .then(user=>{
        if(!user){
            const error = new Error('USer not found');
            error.statusCode=404;
            throw error;
        }
        res.status(200).json({mesage:'Retrieved status',status:user.status});
    })
    .catch(err=>{
        if(!err.statusCode){
            err.statusCode=500;
        }
        next(err);
    });
};

exports.postStatus = (req,res,next)=>{
    const newStatus = req.body.status;
    User.findById(req.userId)
    .then(user=>{
        if(!user){
            const error = new Error('USer not found');
            error.statusCode=404;
            throw error;
        }
        user.status = newStatus;
        return user.save();
    })
    .then(result=>{
        res.status(200).json({mesage:'Retrieved status'});
    })
    .catch(err=>{
        if(!err.statusCode){
            err.statusCode=500;
        }
        next(err);
    });
};


const clearImage = (filePath)=>{
    filePath1 = path.join(__dirname,'..',filePath);
    fs.unlink(filePath1,err=>console.log(err));
};

