const server = require('server');
const { post, error, get } = server.router;
const { status, header } = server.reply;
const statAPI = require('./src/statsAPI');
const locationAPI = require('./src/locationAPI');
const historicAPI = require('./src/historicAPI');
const LocationService = require('./src/services/location');
const CronCheck = require('./src/crons');
const MailService = require('./src/services/mail-server');
const axios = require('axios');
const {CountryHistoricDataScript} = require("./src/historicAPI");
const {USStatesHistoricDataScript} = require("./src/USAHistoricalAPI");

const stat = [
    post('/get/stats', statAPI.info),
    get('/get/locations', locationAPI.getAll),
    post('/get/historic', historicAPI.info),
];

const cors = [
    ctx => header('Access-Control-Allow-Origin', '*'),
    ctx =>
        header(
            'Access-Control-Allow-Headers',
            'Origin, X-Requested-With, Content-Type, Accept'
        ),
    ctx =>
        header(
            'Access-Control-Allow-Methods',
            'GET, PUT, PATCH, POST, DELETE, HEAD, OPTIONS'
        ),
    ctx => (ctx.method.toLowerCase() === 'options' ? status(200) : false),
];

const handleError = error(ctx => {
    ctx.log.error(ctx.error.message);
    return status(404).send('not found');
});

function cronInit(ctx) {
    try {
        setInterval(() => {
            try {
                CronCheck.check().then(result => {
                    if (!result) {
                        ctx.log.info('No issue in data');
                    } else {
                        ctx.log.error('Issue found in data ', result);
                        MailService(result);
                    }
                });
            } catch (e) {
                console.error(e);
                MailService(JSON.stringify(e));
            }
        }, 21600 * 1000);
        
        setInterval(() => {
            try {
                axios.all([USStatesHistoricDataScript(), CountryHistoricDataScript()]).then(axios.spread((usResponse, countriesResp) => {
                    ctx.log.info(usResponse, countriesResp);
                    MailService(JSON.stringify(usResponse + '\n' + countriesResp));
                }));
            } catch (e) {
                ctx.log.error("Historic API", e);
                MailService(JSON.stringify(e));
            }
        }, 21600 * 1000);
    } catch (e) {
        ctx.log.error('Error in running cron ', e);
    }
}

server(
    {
        port: 8080,
        parser: {
            body: { limit: '1mb' },
            json: { limit: '1mb' },
        },
        security: {
            csrf: false,
        },
        PUBLIC: 'public',
    },
    cors,
    stat,
    handleError
).then(ctx => {
    console.log(`Server launched on http://localhost:${ctx.options.port}/`);
    LocationService.init();
    // check in every 6 hours
    cronInit(ctx);
    axios.all([USStatesHistoricDataScript(), CountryHistoricDataScript()]).then(axios.spread((usResponse, countriesResp)=>{
        console.log(usResponse, countriesResp);
    })).catch(e =>{
        console.error(e);  
    });
});
