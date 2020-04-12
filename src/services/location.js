const axios = require('axios');

const stateCountryDiff = async () => {
    _stateCountryDiff = await axios
        .get('http://localhost:8080/get/locations')
        .then(resp => {
            const locations = resp.data.locations;
            const map = new Map();
            locations.forEach(location => {
                map.set(location.value, location);
            });
            return map;
        });
};

let _stateCountryDiff;
let isServiceReady = false;

const StateCountryDiffService = value => {
    return _stateCountryDiff.get(value) || {};
};

const init = () => {
    return axios.all([stateCountryDiff()]).then(() => (isServiceReady = true));
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
};
