const axios = require('axios');

const stateCountryDiff = async () => {
    _stateCountryDiff = await axios
        .get('http://localhost:8080/get/locations')
        .then(resp => {
            const locations = resp.data.locations;
            _locationsData = locations;
            const map = new Map();
            locations.forEach(location => {
                map.set(location.value, location);
            });
            return map;
        });
};

let _stateCountryDiff;
let isServiceReady = false;
let _locationsData;

const StateCountryDiffService = value => {
    return _stateCountryDiff.get(value) || {};
};

const init = () => {
    return axios.all([stateCountryDiff()]).then(() => (isServiceReady = true));
};

const getLocationsInfo = () => {
    return _locationsData;
};
    
const isReady = async () => {
    if (!isServiceReady) {
        await init();
        return isServiceReady;
    }
    return isServiceReady;
};

module.exports = {
    init,
    isReady,
    StateCountryDiffService,
    getLocationsInfo
};
