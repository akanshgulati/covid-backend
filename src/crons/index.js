const { NovelCovid } = require('novelcovid');
const axios = require('axios');
const fs = require('fs');
const allData = require('./all');
const allCountries = require('./AllCountries');
const country = require('./country');
const usState = require('./us-state');
const inState = require('./in-state');

function compareObj(obj1, obj2) {
    if (Object.keys(obj1).length !== Object.keys(obj2).length) {
        return false;
    }
    return JSON.stringify(obj1) === JSON.stringify(obj2);
}

async function checkNovelAllAPI() {
    try {
        const track = new NovelCovid();
        const trackAll = await track.all();
        // const obj = {};
        // Object.keys(trackAll).forEach(key => {
        //     obj[key] = typeof trackAll[key];
        // });
        // // fs.writeFileSync('all.json', JSON.stringify(obj));
        const obj = {};
        Object.keys(trackAll).forEach(key => {
            obj[key] = typeof trackAll[key];
        });
        const result = compareObj(obj, allData);
        return result ? '' : 'All API is failing\n';
    } catch (e) {
        console.log('All API is failing ', e);
        return 'All API is failing';
    }
}

async function checkNovelCountryAPI() {
    try {
        const track = new NovelCovid();
        const countries = await track.countries();
        // const obj = {};
        // Object.keys(countries).forEach(key => {
        //     obj[key] = typeof countries[key];
        // });
        // fs.writeFileSync('AllCountries.json', JSON.stringify(obj));
        const obj = {};
        Object.keys(countries).forEach(key => {
            obj[key] = typeof countries[key];
        });
        const result = compareObj(obj, allCountries);
        return result ? '' : 'All Countries API is failing\n';
    } catch (e) {
        console.log('All Countries API is failing', e);
        return 'All Countries API is failing\n';
    }
}

async function checkNovelACountryAPI() {
    try {
        const track = new NovelCovid();
        const countries = await track.countries();
        // const obj = {};
        // Object.keys(countries[0]).forEach(key => {
        //     obj[key] = typeof countries[0][key];
        // });
        // fs.writeFileSync('country.json', JSON.stringify(obj));
        const obj = {};
        Object.keys(countries[0]).forEach(key => {
            obj[key] = typeof countries[0][key];
        });
        const result = compareObj(obj, country);
        return result ? '' : 'A Country API is failing\n';
    } catch (e) {
        console.log('A Country API failing', e);
        return 'A Country API is failing';
    }
}

async function checkNovelAStateAPI() {
    try {
        const track = new NovelCovid();
        const states = await track.states();
        // const obj = {};
        //     // Object.keys(states[0]).forEach(key => {
        //     //     obj[key] = typeof states[0][key];
        //     // });
        //     // fs.writeFileSync('us-state.json', JSON.stringify(obj));
        const obj = {};
        Object.keys(states[0]).forEach(key => {
            obj[key] = typeof states[0][key];
        });
        const result = compareObj(obj, usState);
        return result ? '' : 'A US State API is failing\n';
    } catch (e) {
        console.log('A US State API is failing');
        return 'A US State API is failing\n';
    }
}

async function checkNovelIndia() {
    try {
        const allStates = await axios
            .get('https://api.covid19india.org/data.json')
            .then(result => {
                return result.data.statewise;
            });
        // const obj = {};
        // Object.keys(allStates[0]).forEach(key => {
        //     obj[key] = typeof allStates[0][key];
        // });
        // fs.writeFileSync('in-state.json', JSON.stringify(obj));
        const obj = {};
        Object.keys(allStates[0]).forEach(key => {
            obj[key] = typeof allStates[0][key];
        });
        const result = compareObj(obj, inState);
        return result ? '' : 'A India state API is failing\n';
    } catch (e) {
        console.log('A India state API is failing', e);
        return 'A India state API is failing\n';
    }
}

const check = async () => {
    const result = await axios.all([
        checkNovelAllAPI(),
        checkNovelCountryAPI(),
        checkNovelACountryAPI(),
        checkNovelAStateAPI(),
        checkNovelIndia(),
    ]);
    let finalString = '';
    result.forEach(res => {
        finalString += res;
    });
    return finalString;
};

exports.check = check;