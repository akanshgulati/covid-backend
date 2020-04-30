const { json } = require('server/reply');
const axios = require('axios');
const {RedisGet, RedisSet} = require('./services/redis');
const RedisKeys = require('./constants/redisKey');
const crypto = require('crypto');
const LocationService = require('./services/location');
const countryNameToIsoMap = require('./staticData/countryNameToIsoMap');
const countryISOToName = require('./staticData/countryISOMap');
const MailService = require('./services/mail-server');
const {info: USAHistoricalData} = require("./USAHistoricalAPI");

function getHash(data) {
    return crypto
        .createHash('sha1')
        .update(JSON.stringify(data))
        .digest('base64');
}

function updateAllCountryData(data) {
    data.forEach(datum => {
        if (datum.country && datum.province) {
            return;
        }
        const dateKeys = Object.keys(datum.timeline.cases).slice(-30);
        const result = {
            total: {},
            recover: {},
            fatal: {},
        };
        const countryKey = countryNameToIsoMap[datum.country];
        if (!countryKey) {
            console.log("No CountryKey found", datum.country);
            // MailService('No CountryKey found', datum.country);
            return;
        }
        dateKeys.forEach(date => {
            result.total[date] = datum.timeline.cases[date];
            result.recover[date] = datum.timeline.recovered[date];
            result.fatal[date] = datum.timeline.deaths[date];
        });
        RedisGet(RedisKeys.HISTORICAL_COUNTRY_HASH + countryKey).then(
            currentHash => {
                const updatedHash = getHash(result);
                if (currentHash !== updatedHash) {
                    RedisSet(RedisKeys.HISTORICAL_COUNTRY + countryKey, result);
                    RedisSet(
                        RedisKeys.HISTORICAL_COUNTRY_HASH + countryKey,
                        updatedHash
                    );
                }
            }
        );
    });
}

async function updateData(redisKey, data) {
    const currentHash = await RedisGet(RedisKeys.HISTORICAL_COUNTRIES_HASH);
    const updatedHash = getHash(data);
    if (currentHash !== updatedHash) {
        RedisSet(redisKey, data);
        RedisSet(RedisKeys.HISTORICAL_COUNTRIES_HASH, updatedHash);
        updateAllCountryData(data);
        return true;
    }
    return false;
}

const CountryHistoricDataScript = async () => {
    try {
        const data = await axios
            .get('https://corona.lmao.ninja/v2/historical')
            .then(response => response.data)
            .catch(e => "Error in Country Historic API" + e.message);
        // if hash is different we are going to update redis
        const check = await updateData(RedisKeys.HISTORICAL_COUNTRIES, data);
        return check
            ? 'Redis Content for Country Updated'
            : 'Redis Content for Country not updated';
    } catch (e) {
        console.log('Error in country historic data');
        return 'Error in country historic data';
    }
};

const info = async ctx => {
    const body = ctx.body;
    let countries = [];
    let USStates = [];
    let isIndiaCountry = false;
    let IndianStates = [];

    await LocationService.isReady();

    body.locations.forEach(location => {
        const value = LocationService.StateCountryDiffService(location);
        if (value.isCountry) {
            countries.push(location);
        } else if (value.isState) {
            if (value.code === 'IN') {
                IndianStates.push(value.label);
            } else if (value.code === 'US') {
                USStates.push(value.label);
            }
        }else {
           // add here 
        }
    });
    const promise = countries.map(country =>
        RedisGet(RedisKeys.HISTORICAL_COUNTRY + country)
    );
    let countriesResultPromise, USStateResultPromise;
    
    if (countries.length) {
        countriesResultPromise = axios.all(promise).then(response => {
            return response.map((datum, index) => {
                return Object.assign({}, {
                    label: countryISOToName[countries[index]],
                    total: {},
                    recover: {},
                    fatal: {}
                }, datum);
            });
        });
    } else {
        countriesResultPromise = Promise.resolve([]);
    }

    if (USStates.length) {
        USStateResultPromise = USAHistoricalData(USStates);
    } else {
        USStateResultPromise = Promise.resolve([]);
    }
    let result = [];
    await axios.all([countriesResultPromise, USStateResultPromise]).then(axios.spread((countriesArr, usStatesArr) => {
        result = [].concat(countriesArr, usStatesArr);
    }));
    // console.log(result);

    return json({ locations: result, updated: +new Date() });
};

exports.info = info;
exports.CountryHistoricDataScript = CountryHistoricDataScript;

// CountryHistoricDataScript();
