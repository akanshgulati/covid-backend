const { RedisGet, RedisSet } = require('./services/redis');
const RedisKeys = require('./constants/redisKey');
const crypto = require('crypto');
const axios = require('axios');
const USStatesEnum = require('./staticData/USStates');
const MailService = require('./services/mail-server');

function getHash(data) {
    return crypto
        .createHash('sha1')
        .update(JSON.stringify(data))
        .digest('base64');
}

async function updateData(states, statesHash) {
    try {
        RedisSet(RedisKeys.HISTORICAL_US_STATES_HASH, statesHash);

        const promises = states.map(state => {
            return RedisSet(RedisKeys.HISTORICAL_US_STATE + state.code, state);
        });
        await axios
            .all(promises)
            .then(() => {
                return 'Redis Content for US States updated\n';
            })
            .catch(e => {
                console.log(e);
                return (
                    'Error occurred in updated US states data in redis' +
                    e.message
                );
            });
    } catch (e) {
        return 'Error occurred in updating US States data' + e.message;
    }
}

async function USStatesHistoricDataScript() {
    const dateWiseStateData = await axios
        .get('https://disease.sh/v2/nyt/states')
        .then(resp => resp.data)
        .catch(e => {
            console.log(e);
            return 'Error in updating US State Data' + e.message;
            // return [];
        });
    const obj = {};
    dateWiseStateData.forEach(data => {
        const { state, date } = data;
        const stateCode = USStatesEnum[state.toLowerCase()];
        obj[state] = obj[state] || {
            country: 'US',
            label: state,
            code: 'US-' + stateCode,
            total: {},
            fatal: {},
            recover: {},
        };

        obj[state].total[date] = data.cases;
        obj[state].fatal[date] = data.deaths;
        obj[state].recover[date] = -1;
    });
    const states = Object.values(obj);
    const statesHash = getHash(states);
    const currentStatesHash = await RedisGet(
        RedisKeys.HISTORICAL_US_STATES_HASH
    );

    if (statesHash === currentStatesHash) {
        return 'Redis Content for US States not updated\n';
    }
    return updateData(states, statesHash);
}
// getALLData();

const info = async USStates => {
    const promises = USStates.map(USState => {
        const stateCode = USStatesEnum[USState.toLowerCase()];
        if (!stateCode) {
            MailService('No US State key found', USState);
            return Promise.resolve({
                country: 'US',
                label: USState,
                total: {},
                fatal: {},
                recover: {},
            });
        }
        const key = RedisKeys.HISTORICAL_US_STATE + 'US-' + stateCode;
        return RedisGet(key);
    });
    return axios.all(promises);
};

exports.info = info;
exports.USStatesHistoricDataScript = USStatesHistoricDataScript;
