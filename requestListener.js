"use strict"
let fs = require('fs');
let path = require('path');
let url = require('url');
let zlib = require('zlib');

let mime = require('./mime.json');
let config = require('./config.json');

module.exports = exports = (req, res) => {
    let pathname = url.parse(req.url).pathname;
    let realPath = 'static' + pathname;

    fs.exists(realPath, isExists => {
        if (isExists) {
            fs.stat(realPath, (err, stats) => {
                if (err) {
                    res.writeHead(500, 'Internal Server Error', { 'Content-Type': 'text/plain' });
                    res.end(err.stack);
                } else {
                    let lastModified = stats.mtime.toUTCString();
                    let ifModifiedSince = req.headers['if-modified-since'];

                    res.setHeader('Last-Modified', lastModified);
                    if (ifModifiedSince &&
                        new Date(lastModified).getTime() <= new Date(ifModifiedSince).getTime()) {
                        res.writeHead(304, 'Not Modified', { 'Content-Type': 'text/plain' });
                        res.end();
                    } else {
                        let ext = path.extname(realPath);
                        ext = ext ? ext.slice(1) : 'unknow';

                        if (new RegExp(config['expiresMatch'], 'i').test(ext)) {
                        	let expires = new Date();
                        	expires.setTime(expires.getTime() + config['maxAge'] * 1000);

                        	res.setHeader('Expires', expires.toUTCString());
                        	res.setHeader('Cache-Control', 'max-age=' + config['maxAge']);
                        }

                        let compressMatch = new RegExp(config['compressMatch'], 'i').test(ext);
                        let acceptEncoding = req.headers['accept-encoding'];
                        let fileStream = fs.createReadStream(realPath);

                        if (compressMatch && new RegExp('\\bgzip\\b', 'i').test(acceptEncoding)) {
                            res.writeHead(200, 'Ok', { 'Content-Encoding': 'gzip' });
                            fileStream.pipe(zlib.createGzip()).pipe(res);
                        } else if (compressMatch && new RegExp('\\bdeflate\\b', 'i').test(acceptEncoding)) {
                            res.writeHead(200, 'Ok', { 'Content-Encoding': 'deflate' });
                            fileStream.pipe(zlib.createDeflate()).pipe(res);
                        } else {
                            res.write(200, 'Ok', { 'Content-Type': 'text/plain' });
                            fileStream.pipe(res);
                        }
                    }
                }
            });
        } else {
            res.writeHead(404, 'Not Found', { 'Content-Type': 'text/plain' });
            res.end('the request URL ' + pathname + ' was not found on this server!');
        }
    });
};