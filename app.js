// app.js
const express = require('express');
const imagesRouter = require('./routes/images');

const app = express();
app.use(express.json());
app.use('/images', imagesRouter);

module.exports = app;