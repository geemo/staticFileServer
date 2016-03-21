"use strict"
let fs = require('fs');
let path = require('path');
let url = require('url');
let zlib = require('zlib');

let mime = require('./mime.json');
let config = require('./config.json');
let parseRange = require('./parseRange.js');

let cacheHandle = (res, ext) => {

    if (new RegExp(config['expiresMatch'], 'i').test(ext)) {
        let expires = new Date();
        expires.setTime(expires.getTime() + config['maxAge'] * 1000);

        res.setHeader('Expires', expires.toUTCString());
        res.setHeader('Cache-Control', 'max-age=' + config['maxAge']);
    }
};

let compressHandle = (req, res, stream, ext, status) => {

    let compressMatch = new RegExp(config['compressMatch'], 'i').test(ext);
    let acceptEncoding = req.headers['accept-encoding'];

    if (compressMatch && new RegExp('\\bgzip\\b', 'i').test(acceptEncoding)) {
        res.writeHead(status.code, status.message, { 'Content-Encoding': 'gzip' });
        stream.pipe(zlib.createGzip()).pipe(res);
    } else if (compressMatch && new RegExp('\\bdeflate\\b', 'i').test(acceptEncoding)) {
        res.writeHead(status.code, status.message, { 'Content-Encoding': 'deflate' });
        stream.pipe(zlib.createDeflate()).pipe(res);
    } else {
        res.writeHead(status.code, status.message);
        stream.pipe(res);
    }

};

let pathHandle = (req, res) => {
    let pathname = url.parse(req.url).pathname;
    if (pathname[pathname.length - 1] === '/') {
        pathname += config['homePageFile'];
    }
    //禁止父路径
    let realPath = path.join('static', path.normalize(pathname.replace(/\.\./g, '')));

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

                    cacheHandle(res, ext);
                    if (req.headers['range']) {
                        let range = parseRange(req.headers['range'], stats.size);
                        console.log(range);
                        if (range) {
                            let rangeStream = fs.createReadStream(realPath, range);
                            res.setHeader('Content-Range', 'byptes ' + range.start + '-' + range.end + '/' + stats.size);
                            compressHandle(req, res, rangeStream, ext, {code: 206, message: 'Partial Content'});
                        } else {
                            res.writeHead(416, "Request Range Not Satisfiable");
                            res.end();
                        }
                    } else {
                        let fileStream = fs.createReadStream(realPath);
                        compressHandle(req, res, fileStream, ext, {code: 200, message: 'Ok'});
                    }


                }
            }
        }
    });
}

module.exports = exports = (req, res) => {
    res.setHeader('Server', 'Node/5.8.0');
    res.setHeader('Accept-Range', 'bytes');
    pathHandle(req, res);
};