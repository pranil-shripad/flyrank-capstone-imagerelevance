// app.js
const express = require('express');
const imagesRouter = require('./routes/images');
const postsRouter = require('./routes/posts');
const reviewsRouter = require('./routes/reviews');

const app = express();
app.use(express.json());
app.use('/images', imagesRouter);
app.use('/posts', postsRouter);
app.use('/reviews', reviewsRouter);

module.exports = app;