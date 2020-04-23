const promisifyRedis = require('promisify-redis');
const redis = promisifyRedis(require('redis'));
const Redis = redis.createClient();

function RedisSet(key, value) {
    if (typeof key === 'undefined' || typeof value === 'undefined') {
        return;
    }
    if (typeof value === typeof {}) {
        return Redis.set(key, JSON.stringify(value));
    }
    return Redis.set(key, value);
}

function RedisGet(key) {
    if (typeof key === 'undefined') {
        return;
    }
    return Redis.get(key).then(value => {
        try {
            return JSON.parse(value);
        } catch (e) {
            return value;
        }
    });
}
module.exports = {
    RedisGet,
    RedisSet
};