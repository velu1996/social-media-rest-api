const { validationResult } = require('express-validator');
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.signup = (req,res,next)=>{
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        const error = new Error('Validation Failed');
        error.statusCode = 422;
        error.data = errors.array();
        throw error;
    }
    const email = req.body.email;
    const name = req.body.name;
    const password = req.body.password;
    bcrypt.hash(password,12)
    .then(hashedPassword=>{
        const user = new User({
            email:email,
            name:name,
            password:hashedPassword
        });
        return user.save();
    })
    .then(result=>{
        res.status(201).json({Message:'New user created',userId:result._id});
    })
    .catch(err=>{
        if(!err.statusCode){
            err.statusCode=500;
        }
        next(err);
    });
};

exports.login = (req,res,next)=>{
    const email = req.body.email;
    const password = req.body.password;
    let loadedUser;
    User.findOne({email:email})
    .then(user=>{
        if(!user){
            const error = new Error('Cannot be found');
            error.statusCode = 401;
            throw error;
        }
        loadedUser=user;
        bcrypt.compare(password,user.password)
        .then(isEqual=>{
            if(!isEqual){
                const error = new Error('Incorrect password');
                error.statusCode = 401;
                throw error;
            }
            const token = jwt.sign({
                email:loadedUser.email,
                userId:loadedUser._id.toString()
            },'secret',
                {expiresIn:'1h'}
            );
            res.status(200).json({message:'Logged in',token:token,userId:loadedUser._id.toString()});
        })
    })
    .catch(err=>{
        if(!err.statusCode){
            err.statusCode=500;
        }
        next(err);
    });

};