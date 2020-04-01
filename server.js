const server = require("server");
const {post, error, get} = server.router;
const {status, header} = server.reply;
const statAPI = require("./src/statsAPI");
const locationAPI = require("./src/locationAPI");


const stat = [
    post('/get/stats', statAPI.info),
    get('/get/locations', locationAPI.getAll)
];

const cors = [
    ctx => header("Access-Control-Allow-Origin", "*"),
    ctx => header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept"),
    ctx => header("Access-Control-Allow-Methods", "GET, PUT, PATCH, POST, DELETE, HEAD, OPTIONS"),
    ctx => ctx.method.toLowerCase() === 'options' ? status(200) : false
];

const handleError = error(ctx => {
    console.log("Error", ctx.error.message);
    return status(404).send("not found");
});


server(
    {
        port: 8080,
        parser: {
            body: {limit: '1mb'},
            json: {limit: '1mb'}
        },
        security: {
            csrf: false
        },
        PUBLIC: 'public'
    },
    cors,
    stat,
    handleError,
);

