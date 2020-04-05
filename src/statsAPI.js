const {json} = require('server/reply');
const {NovelCovid} = require('novelcovid');
const axios = require("axios");

exports.info = async ctx => {
    const track = new NovelCovid();
    const body = ctx.body;
    let countries = [];
    let states = [];

    body.locations.forEach(location => {
        const length = location.split("-").length;
        if (length === 1) {
            countries.push(location);
        } else if (length === 2) {
            states.push(location);
        }
    });

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
    let globalResult = {};
    let promiseCount = +(!!countries.length) + +(!!USStates.length) + +(!!IndianStates.length) + 1;
    let currentCount = 0;
    let countryData;

    await new Promise((resolve, reject) => {
        track.all().then(result => {
            globalResult = {
                active: result.active,
                total: result.cases,
                fatal: result.deaths,
                recover: result.recovered
            };
            currentCount++;
            if (currentCount === promiseCount) {
                resolve();
            }
        });
        
        if (countries.length) {
            const set = new Set(countries);
            axios.all([
                axios.get("https://corona.lmao.ninja/yesterday").then(resp => resp.data), 
                track.countries()
            ]).then(result => {
                countryData = result[1].filter(country => set.has(country.countryInfo.iso2));
                finalResult = finalResult.concat(formatCountry(countryData, result[0]));
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
    return json({
        locations: finalResult,
        global: globalResult,
        updated: +new Date()
    });
};

function getSymbol(number) {
    return number < 0 ? "-" : "+";
}
function formatCountry(data, prevDayData) {
    const prevDayDataMap = new Map();
    if (prevDayData && prevDayData.length) {
        // creating map
        prevDayData.forEach(country => {
            prevDayDataMap.set(country.countryInfo.iso2, country);
        });
    }
    return data.map(item => {
        // checking if yesterday data is present
        const yesterdayData = prevDayDataMap.get(item.countryInfo.iso2);
        let isRecoverDelta,
            isActiveDelta,
            activeDelta,
            recoverDelta;
        
        if (yesterdayData) {
            isRecoverDelta = typeof yesterdayData.recovered !== "undefined";
            isActiveDelta = typeof yesterdayData.active !== "undefined";
            activeDelta = item.active - yesterdayData.active;
            recoverDelta = item.recovered - yesterdayData.recovered;
        }
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
            delta: {
                total: item.todayCases,
                fatal: item.todayDeaths,
                recover: isRecoverDelta ? Math.abs(recoverDelta) : null,
                active: isActiveDelta ? Math.abs(activeDelta) : null,
                totalSymbol: "+",
                fatalSymbol: "+",
                recoverSymbol: getSymbol(recoverDelta),
                activeSymbol: getSymbol(activeDelta)
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
            delta: {
                total: item.todayCases,
                fatal: item.todayDeaths,
                totalSymbol: "+",
                fatalSymbol: "+",
                recoverSymbol: "+",
                activeSymbol: "+"
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
                active: parseInt(item.active),
                fatal: parseInt(item.deaths),
                recover: parseInt(item.recovered),
                total: parseInt(item.confirmed)
            },
            delta: {
                total: item.deltaconfirmed,
                fatal: item.deltadeaths,
                recover: item.deltarecovered,
                active: item.deltaactive,
                totalSymbol: "+",
                fatalSymbol: "+",
                recoverSymbol: "+",
                activeSymbol: "+"
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