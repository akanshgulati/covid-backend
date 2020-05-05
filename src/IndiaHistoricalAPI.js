const axios = require('axios');
const moment = require('moment');
const StateCodeToNameEnum = require('./staticData/IndianStatesCodeToName');
const StateNameToCodeEnum = require('./staticData/IndianStatesNameToCode');
const crypto = require('crypto');
const { RedisGet, RedisSet } = require('./services/redis');
const RedisKeys = require('./constants/redisKey');
const MailService = require('./services/mail-server');

function getHash(data) {
    return crypto
        .createHash('sha1')
        .update(JSON.stringify(data))
        .digest('base64');
}

async function updateData(states, statesHash) {
    try {
        RedisSet(RedisKeys.HISTORICAL_IN_STATES_HASH, statesHash);

        const promises = states.map(state => {
            return RedisSet(RedisKeys.HISTORICAL_IN_STATE + state.code, state);
        });
        await axios
            .all(promises)
            .then(() => {
                return 'Redis Content for IN States updated\n';
            })
            .catch(e => {
                console.log(e);
                return (
                    'Error occurred in updated IN states data in redis' +
                    e.message
                );
            });
    } catch (e) {
        return 'Error occurred in updating IN States data' + e.message;
    }
}

async function IndianStatesHistoricDataScript() {
    const rawDataArr = await axios
        .get('https://api.covid19india.org/states_daily.json')
        .then(resp => parseStateTimeSeries(resp.data.states_daily))
        .catch(e => {
            console.log(e);
            return 'Error in updating IN State Data' + e.message;
        });
    
    let resultObj = {};
    
    Object.keys(StateCodeToNameEnum).forEach(code => {
        const stateName = StateCodeToNameEnum[code];
        if (!stateName) {
            console.log(
                'State data for India not found in static map',
                code
            );
        }
        // last 30 days data
        const stateDataArr = rawDataArr[code].slice(-30);
        stateDataArr.forEach(dateWiseData => {
            
            resultObj[code] = resultObj[code] || {
                country: 'IN',
                label: stateName,
                code: 'IN-' + code,
                total: {},
                fatal: {},
                recover: {},
            };

            resultObj[code].total[dateWiseData.date] = dateWiseData.totalconfirmed;
            resultObj[code].fatal[dateWiseData.date] = dateWiseData.totaldeceased;
            resultObj[code].recover[dateWiseData.date] = dateWiseData.totalrecovered;
        });
        
    });

    const states = Object.values(resultObj);
    const statesHash = getHash(states);
    const currentStatesHash = await RedisGet(
        RedisKeys.HISTORICAL_IN_STATES_HASH
    );

    if (statesHash === currentStatesHash) {
        return '\nRedis Content for IN States not updated\n';
    }
    return updateData(states, statesHash);
}

const info = async IndianStates => {
    const promises = IndianStates.map(state => {
        const stateCode = StateNameToCodeEnum[state.toLowerCase()];
        if (!stateCode) {
            MailService('No IN State key found -' + state);
            return Promise.resolve({
                country: 'IN',
                label: state,
                total: {},
                fatal: {},
                recover: {},
            });
        }
        const key = RedisKeys.HISTORICAL_IN_STATE + 'IN-' + stateCode.toUpperCase();
        return RedisGet(key);
    });
    return axios.all(promises);
};

function parseStateTimeSeries(data) {
    const stateWiseSeries = Object.keys(StateCodeToNameEnum).reduce((a, c) => {
        a[c] = [];
        return a;
    }, {});

    const today = moment();
    for (let i = 0; i < data.length; i += 3) {
        const date = moment(data[i].date, "DD-MMM-YY");
        // Skip data from the current day
        if (date.diff(today) < 0) {
            Object.entries(stateWiseSeries).forEach(([k, v]) => {
                const stateCode = k.toLowerCase();
                const prev = v[v.length - 1] || {};
                // Parser
                const dailyconfirmed = +data[i][stateCode] || 0;
                const dailyrecovered = +data[i + 1][stateCode] || 0;
                const dailydeceased = +data[i + 2][stateCode] || 0;
                const totalconfirmed = +data[i][stateCode] + (prev.totalconfirmed || 0);
                const totalrecovered =
                    +data[i + 1][stateCode] + (prev.totalrecovered || 0);
                const totaldeceased =
                    +data[i + 2][stateCode] + (prev.totaldeceased || 0);
                // Push
                v.push({
                    date: date.format("MM/DD/YYYY"),
                    dailyconfirmed: dailyconfirmed,
                    dailyrecovered: dailyrecovered,
                    dailydeceased: dailydeceased,
                    totalconfirmed: totalconfirmed,
                    totalrecovered: totalrecovered,
                    totaldeceased: totaldeceased,
                    // Active = Confimed - Recovered - Deceased
                    totalactive: totalconfirmed - totalrecovered - totaldeceased,
                    dailyactive: dailyconfirmed - dailyrecovered - dailydeceased,
                });
            });
        }
    }

    return stateWiseSeries;
}

exports.info = info;
exports.IndianStatesHistoricDataScript = IndianStatesHistoricDataScript;