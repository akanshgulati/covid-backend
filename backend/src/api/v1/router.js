const express = require('express');
const fileRoutes = require('./files/routes');
const getRoutes = require('./get/routes');

const router = express.Router();

/**
 * GET v1/status
 */
router.get('/status', (req, res) => res.send('OK'));
/**
 * GET v1/docs
 */
router.use('/docs', express.static('docs'));
/**
 * GET v1/images
 */
router.use('/images', express.static('public'));
/**
 * GET v1/files
 */
router.use('/files', fileRoutes);
/**
 * GET v1/user
 */
// router.use('/user', userRoutes);

router.use('/get', getRoutes);

module.exports = router;
