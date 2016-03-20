"use strict"
let http = require('http');

let requestListener = require('./requestListener.js');
let config = require('./config.json');

let server = http.createServer();

server.on('request', requestListener);

server.listen(config.port, () => {
    console.log('server listen on port: ' + config.port);
});