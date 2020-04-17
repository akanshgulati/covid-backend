const { json } = require('server/reply');
const { NovelCovid } = require('novelcovid');
const axios = require('axios');
const LocationService = require('./services/location');
const moment = require('moment');

exports.info = async ctx => {
    const track = new NovelCovid();
    const body = ctx.body;
    let countries = [];
    let USStates = [];
    let isIndiaCountry = false;
    let IndianStates = [];

    await LocationService.isReady();

    body.locations.forEach(location => {
        const value = LocationService.StateCountryDiffService(location);
        if (value.isCountry) {
            if (value.code !== 'IN') {
                countries.push(location);
            } else {
                isIndiaCountry = true;
            }
        } else if (value.isState) {
            if (value.code === 'IN') {
                IndianStates.push(value.label);
            } else if (value.code === 'US') {
                USStates.push(value.label);
            }
        }
    });

    let finalResult = [];
    let globalResult = {};
    // plus 1 is for global count promise
    let promiseCount =
        +!!countries.length + +!!USStates.length + +(!!IndianStates.length || isIndiaCountry) + 1;
    let currentCount = 0;
    let countryData;

    await new Promise(resolve => {
        track
            .all()
            .then(result => {
                globalResult = {
                    active: result.active,
                    total: result.cases,
                    fatal: result.deaths,
                    recover: result.recovered,
                };
            })
            .catch(e => {
                globalResult = {
                    active: 0,
                    total: 0,
                    fatal: 0,
                    recover: 0,
                };
                ctx.log.error('Track All Failed ', e);
            })
            .then(() => {
                currentCount++;
                if (currentCount === promiseCount) {
                    resolve();
                }
            });

        if (countries.length) {
            const set = new Set(countries);
            axios
                .all([
                    axios
                        .get('https://corona.lmao.ninja/v2/countries?yesterday=true')
                        .then(resp => resp.data),
                    track.countries(),
                ])
                .then(result => {
                    countryData = result[1].filter(country =>
                        set.has(country.countryInfo.iso2)
                    );
                    finalResult = finalResult.concat(
                        formatCountry(countryData, result[0])
                    );
                })
                .catch(e => {
                    ctx.log.error('Track Countries API Failed ', e);
                })
                .then(() => {
                    currentCount++;
                    if (currentCount === promiseCount) {
                        resolve();
                    }
                });
        }

        if (USStates.length) {
            const USStateSet = new Set(USStates);
            track
                .states()
                .then(result => {
                    const USStatesData = result.filter(state =>
                        USStateSet.has(state.state)
                    );
                    finalResult = finalResult.concat(
                        formatUSStates(USStatesData)
                    );
                })
                .catch(e => {
                    ctx.log.error('US States API Failed ', e);
                })
                .then(() => {
                    currentCount++;
                    if (currentCount === promiseCount) {
                        resolve();
                    }
                });
        }

        if (IndianStates.length || isIndiaCountry) {
            fetchIndianStateData(IndianStates, isIndiaCountry)
                .then(result => {
                    finalResult = finalResult.concat(
                        formatIndianStates(result)
                    );
                })
                .catch(e => {
                    ctx.log.error('Indian States API Failed ', e);
                })
                .then(() => {
                    currentCount++;
                    if (currentCount === promiseCount) {
                        resolve();
                    }
                });
        }
    });

    return json({
        locations: finalResult,
        global: globalResult,
        updated: +new Date(),
    });
};

function getSymbol(number) {
    return number < 0 ? '-' : '+';
}

function formatIndianDate(data) {
    if (!data) {
        return;
    }
    return +moment(data, "DD/MM/YYYY HH:mm:ss");
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
        let isRecoverDelta, isActiveDelta, activeDelta, recoverDelta;

        if (yesterdayData) {
            isRecoverDelta = typeof yesterdayData.recovered !== 'undefined';
            isActiveDelta = typeof yesterdayData.active !== 'undefined';
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
                total: item.cases,
            },
            delta: {
                total: item.todayCases,
                fatal: item.todayDeaths,
                recover: isRecoverDelta ? Math.abs(recoverDelta) : null,
                active: isActiveDelta ? Math.abs(activeDelta) : null,
                totalSymbol: '+',
                fatalSymbol: '+',
                recoverSymbol: getSymbol(recoverDelta),
                activeSymbol: getSymbol(activeDelta),
            },
            updated: item.updated,
        };
    });
}

function formatUSStates(data) {
    return data.map(item => {
        return {
            label: item.state,
            iso: 'US',
            code: 'US-' + item.state,
            all: {
                active: item.active,
                fatal: item.deaths,
                recover: item.cases - item.deaths - item.active,
                total: item.cases,
            },
            delta: {
                total: item.todayCases,
                fatal: item.todayDeaths,
                totalSymbol: '+',
                fatalSymbol: '+',
                recoverSymbol: '+',
                activeSymbol: '+',
            },
            updated: '',
        };
    });
}

function formatIndiaCountry(item) {
    return {
        label: 'India',
        iso: 'IN',
        code: 'IN',
        all: {
            active: parseInt(item.active),
            fatal: parseInt(item.deaths),
            recover: parseInt(item.recovered),
            total: parseInt(item.confirmed),
        },
        delta: {
            total: +item.deltaconfirmed,
            fatal: +item.deltadeaths,
            recover: +item.deltarecovered,
            active: +item.deltaactive,
            totalSymbol: '+',
            fatalSymbol: '+',
            recoverSymbol: '+',
            activeSymbol: '+',
        },
        updated: item.lastupdatedtime && formatIndianDate(item.lastupdatedtime),
    };
}

function formatIndianStates(data) {
    return data.map(item => {
        // handling India data easily
        if (item.state === 'Total') {
            return formatIndiaCountry(item);
        }
        return {
            label: item.state,
            iso: 'IN',
            code: 'IN-' + item.state,
            all: {
                active: parseInt(item.active),
                fatal: parseInt(item.deaths),
                recover: parseInt(item.recovered),
                total: parseInt(item.confirmed),
            },
            delta: {
                total: +item.deltaconfirmed,
                fatal: +item.deltadeaths,
                recover: +item.deltarecovered,
                active: +item.deltaactive,
                totalSymbol: '+',
                fatalSymbol: '+',
                recoverSymbol: '+',
                activeSymbol: '+',
            },
            updated: item.lastupdatedtime && formatIndianDate(item.lastupdatedtime),
        };
    });
}

function fetchIndianStateData(states, isIndiaCountry) {
    return axios.get('https://api.covid19india.org/data.json').then(result => {
        const allStateData = result.data.statewise;
        const set = new Set(states);
        if (isIndiaCountry) {
            set.add('Total');
        }
        return allStateData.filter(stateInfo => set.has(stateInfo.state));
    });
}
