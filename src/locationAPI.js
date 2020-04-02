const {json} = require('server/reply');
const {NovelCovid} = require('novelcovid');
const axios = require("axios");

exports.getAll = async (ctx) => {
    let covid = new NovelCovid();

    const result = await axios.all([
        covid.countries(),
        covid.states(),
        axios.get("https://api.covid19india.org/data.json").then(resp => resp.data)
    ]);
    const countriesData = result[0];
    const USStatesData = result[1];
    const IndianStatesData = result[2] && result[2].statewise;

    const finalResult = [];
    countriesData.forEach(countryInfo => {
        if (countryInfo.countryInfo.iso2) {
            finalResult.push({
                label: countryInfo.country,
                code: countryInfo.countryInfo.iso2,
                value: countryInfo.countryInfo.iso2,
                isCountry: true,
                isState: false
            })
        }
    });
    USStatesData.forEach(data => {
        finalResult.push({
            label: data.state,
            code: 'US',
            country: "US",
            value: "US-" + data.state,
            isCountry: false,
            isState: true
        });
    });
    IndianStatesData.forEach(data => {
        finalResult.push({
            label: data.state,
            code: "IN",
            country: "IN",
            value: "IN-" + data.state,
            isCountry: false,
            isState: true
        })
    });
    return json({
        locations: finalResult.sort((a, b) => {
            if (a.label < b.label) {
                return -1;
            }
            if (a.label > b.label) {
                return 1;
            }
            return 0;
        })
    });
};