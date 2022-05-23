const express = require('express');
const {body} = require('express-validator');

const feedController = require('../controllers/feed');
const isAuth = require('../middleware/is-auth');
const isauth = require('../middleware/is-auth');

const router = express.Router();

router.post('/post', [
    body('title').trim().isLength({min:5}),
    body('content').trim().isLength({min:5}),
],isauth,feedController.createPost);

router.get('/posts', isauth,feedController.getPosts);

router.get('/post/:postId',isauth,feedController.getPost);

router.put('/post/:postId', [
    body('title').trim().isLength({min:5}),
    body('content').trim().isLength({min:5}),
],isauth,
feedController.updatePost);

router.delete('/post/:postId',isauth,feedController.deletePost);

router.get('/status',isauth,feedController.getStatus);

router.patch('/status',isAuth,[
    body('status').trim().not().isEmpty()
],feedController.postStatus);


module.exports = router;