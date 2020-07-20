const { json } = require('server/reply');
const axios = require('axios');
const StateCodeToNameEnum = require('./staticData/IndianStatesCodeToName'); 
    
function fetchIndianDistrictData(stateName) {
    return axios.get('https://api.covid19india.org/state_district_wise.json').then(result => {
        return result.data[stateName];
    });
}

function formatDistrictData(data, districtName, stateName) {
    const key = `IN-${stateName}-${districtName}`;
    return {
        "label": districtName,
        "iso": "IN",
        "code": key,
        "all": {
            "active": data.active,
            "fatal": data.deceased,
            "recover": data.recovered,
            "total": data.confirmed
        },
        "delta": {
            "total": data.delta.confirmed,
            "fatal": data.delta.deceased,
            "recover": data.delta.recovered,
            "active": data.delta.active,
            "totalSymbol": "+",
            "fatalSymbol": "+",
            "recoverSymbol": "+",
            "activeSymbol": "+"
        },
        "hasHistoricData": false,
        "updated": +new Date()
    }
}

exports.getStateDistrictData = async ctx => {
    const stateCode = ctx.params.stateCode;
    // IN-HARYANA
    if (!stateCode) {
        return json({
            locations: []
        });
    }
    
    const stateName = stateCode.split("-")[1];
    const districtsObj = await fetchIndianDistrictData(stateName);
    if (!districtsObj.districtData) {
        // handle case here
    }
    const districtsData = districtsObj.districtData;
    const result = [];
    Object.keys(districtsData).forEach(districtName =>{
        const formattedResult = formatDistrictData(districtsData[districtName], districtName, stateName);
        result.push(formattedResult);
    });
    
    return json({
        locations: result
    });
}