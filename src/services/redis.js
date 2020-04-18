const promisifyRedis = require('promisify-redis');
const redis = promisifyRedis(require('redis'));
const client = redis.createClient();
module.exports = client;