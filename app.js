"use strict"
let http = require('http');
let url = require('url');
let fs = require('fs');
let path = require('path');
let zlib = require('zlib');

let mime = require('./mime.js');
let config = require('./config.js');

let server = http.createServer();
const PORT = process.env.PORT || 80;

server.on('request', (req, res) => {
    let pathname = url.parse(req.url).pathname;
    let realPath = 'static' + pathname;

    console.log(req.headers);
    fs.exists(realPath, isExists => {

        if (isExists) {

            fs.stat(realPath, (err, stats) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end(err.stack);
                } else {
                    let lastModified = stats.mtime.toUTCString();
                    res.setHeader('Last-Modified', lastModified);

                    if (req.headers['if-modified-since'] && lastModified === req.headers['if-modified-since']) {
                        res.writeHead(304, 'Not Modified');
                        res.end();
                    } else {

                        let ext = path.extname(realPath);
                        ext = ext ? ext.slice(1) : 'unknow';

                        res.setHeader('Content-Type', mime[ext] || 'text/plain');

                        if (ext.match(config.Expires.fileMatch)) {
                            let expire = new Date();
                            expire.setTime(expire.getTime() + config.Expires.maxAge * 1000);
                            res.setHeader('Expires', expire.toUTCString());
                            res.setHeader('Cache-Control', 'max-age=' + config.Expires.maxAge);
                        }

                        let raw = fs.createReadStream(realPath);
                        let acceptEncoding = req.headers['accept-encoding'] || '';
                        let isMatch = config.Compress.match.test(ext);

                        if (isMatch && /\bgzip\b/i.test(acceptEncoding)) {
                            res.writeHead(200, { 'Content-Encoding': 'gzip' });
                            raw.pipe(zlib.createGzip()).pipe(res);

                        } else if (isMatch && /\bdeflate\b/i.test(acceptEncoding)) {
                            res.writeHead(200, { 'Content-Encoding': 'deflate' });
                            raw.pipe(zlib.createDeflate()).pipe(res);
                        } else {
                            res.writeHead(200, 'Ok');
                            raw.pipe(res);
                        }
                    }
                }
            });

        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.write('This request URL ' + pathname + 'was not found on this server.\r\n');
            res.end();
        }
    });

});

server.listen(PORT, () => {
    console.log('server start on port: ' + PORT);
});