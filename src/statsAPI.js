const {status, json} = require('server/reply');
const { NovelCovid } = require('novelcovid');
const axios = require("axios");

exports.info = async ctx => {
    const track = new NovelCovid();
    
    const body = JSON.parse(ctx.body);
    const countries = body.countries || [];
    const states = body.states;
    let USStates = [];
    let IndianStates = [];
    if (states && states.length) {
        states.forEach(item => {
            const split = item.split("-");
            const country = split[0];
            if (country === "US") {
                USStates.push(split[1]);
            } else if (country === "IN") {
                IndianStates.push(split[1]);
            }
        });
    }
    
    let finalResult = [];
    let promiseCount = +(!!countries.length) + +(!!USStates.length) + +(!!IndianStates.length);
    let currentCount = 0;
    let countryData;
    console.log("Promise count", promiseCount);
    
    await new Promise((resolve, reject)=>{
        if (countries.length) {
            const set = new Set(countries);
            track.countries().then(result => {
                countryData = result.filter(country => set.has(country.countryInfo.iso2));
                finalResult = finalResult.concat(formatCountry(countryData));
                currentCount++;
                if (currentCount === promiseCount) {
                    resolve();
                }
            });
        }

        if (USStates.length) {
            track.states().then(result => {
                const USStatesData = result.filter(state => USStates.indexOf(state.state) > -1);
                finalResult = finalResult.concat(formatUSStates(USStatesData));
                currentCount++;
                if (currentCount === promiseCount) {
                    resolve();
                }
            });
        }

        if (IndianStates.length) {
            fetchIndianStateData(IndianStates).then(result => {
                finalResult = finalResult.concat(formatIndianStates(result));
                currentCount++;
                if (currentCount === promiseCount) {
                    resolve();
                }
            })
        }
    });
    return json(finalResult);
};

function formatCountry(data) {
    return data.map(item => {
        return {
            label: item.country,
            iso: item.countryInfo.iso2,
            code: item.countryInfo.iso2,
            all: {
                active: item.active,
                fatal: item.deaths,
                recover: item.recovered,
                total: item.cases
            },
            today: {
                total: item.todayCases,
                fatal: item.todayDeaths
            },
            updated: item.updated
        }
    })
}

function formatUSStates(data) {
    return data.map(item => {
        return {
            label: item.state,
            iso: "US",
            code: "US-" + item.state,
            all: {
                active: item.active,
                fatal: item.deaths,
                recover: item.cases - item.deaths - item.active,
                total: item.cases
            },
            today: {
                total: item.todayCases,
                fatal: item.todayDeaths
            },
            updated: ""
        }
    });
}

function formatIndianStates(data) {
    console.log("Data", data);
    return data.map(item => {
        return {
            label: item.state,
            iso: "IN",
            code: "IN-" + item.state,
            all: {
                active: item.active,
                fatal: item.deaths,
                recover: item.recovered,
                total: item.confirmed
            },
            today: {
                total: item.delta.confirmed,
                fatal: item.delta.deaths,
                recover: item.delta.recovered,
                active: item.delta.active,
            },
            updated: ""
        }
    });
}

function fetchIndianStateData(states) {
    return axios.get("https://api.covid19india.org/data.json").then(result => {
        const allStateData = result.data.statewise;
        const set = new Set(states);
        console.log("States", states);
        return allStateData.filter(stateInfo => set.has(stateInfo.state));
    });
}