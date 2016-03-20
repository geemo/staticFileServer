"use strict"
let fs = require('fs');
let path = require('path');
let url = require('url');
let zlib = require('zlib');

let mime = require('./mime.json');
let config = require('./config.json');

let pathHandle = (realPath, req, res) => {

    fs.stat(realPath, (err, stats) => {
        if (err) {
            res.writeHead(404, 'Not Found', { 'Content-Type': 'text/plain' });
            res.end('the request URL ' + pathname + ' was not found on this server!');
        } else {
            if (stats.isDirectory()) {
            	pathHandle(path.join(realPath, '/', config['homePageFile']), req, res);
            } else {
                let lastModified = new Date(stats.mtime);
                let ifModifiedSince = new Date(req.headers['if-modified-since']);

                res.setHeader('Last-Modified', lastModified.toUTCString());
                if (ifModifiedSince &&
                    lastModified.getTime() <= ifModifiedSince.getTime()) {
                    res.writeHead(304, 'Not Modified', { 'Content-Type': 'text/plain' });
                    res.end();
                } else {
                    let ext = path.extname(realPath);
                    ext = ext ? ext.slice(1) : 'unknow';
                    res.setHeader('Content-Type', mime[ext] || 'text/plain');

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
                        res.writeHead(200, 'Ok');
                        fileStream.pipe(res);
                    }
                }
            }
        }
    });
}

module.exports = exports = (req, res) => {
    let pathname = url.parse(req.url).pathname;
    if (pathname[pathname.length - 1] === '/') {
        pathname += config['homePageFile'];
    }
    //禁止父路径
    let realPath = path.join('static', path.normalize(pathname.replace(/\.\./g, '')));

    res.setHeader('Server', 'Node/5.8.0');
    pathHandle(realPath, req, res);

};