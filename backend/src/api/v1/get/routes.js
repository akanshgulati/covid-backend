const express = require('express');

const routes = express.Router();

const controller = require('./controller');

routes.route('/').get(controller.getLocations);

module.exports = routes;