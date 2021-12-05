const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const UPNG = require('@pdf-lib/upng').default;
const port = process.argv[2] || 9000;

http.createServer(function (req, res) {
    // console.log(`${req.method} ${req.url}`);

    // parse URL
    const parsedUrl = url.parse(req.url);
    // extract URL path
    let pathname = `.${parsedUrl.pathname}`;
    // based on the URL path, extract the file extension. e.g. .js, .doc, ...
    const ext = path.parse(pathname).ext;
    // maps file extension to MIME typere
    const map = {
        '.ico': 'image/x-icon',
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.css': 'text/css',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.wav': 'audio/wav',
        '.mp3': 'audio/mpeg',
        '.svg': 'image/svg+xml',
        '.pdf': 'application/pdf',
        '.doc': 'application/msword'
    };

    fs.exists(pathname, function (exist) {
        if(!exist) {
            // if the file is not found, return 404
            res.statusCode = 404;
            res.end(`File ${pathname} not found!`);
            return;
        }

        // if is a directory search for index file matching the extension
        if (fs.statSync(pathname).isDirectory()) pathname += '/index' + ext;

        // read file from file system
        fs.readFile(pathname, function(err, imgBuffer){
            if(err){
                res.statusCode = 500;
                res.end(`Error getting the file: ${err}.`);
            } else {
                const imgObj = UPNG.decode(imgBuffer);
                const originalWidth=imgObj.width,
                    originalHeight=imgObj.height;
                const delayArr = imgObj.frames.map(value=>{
                    return value.delay
                });

                let img = UPNG.toRGBA8(imgObj);
                res.statusCode = 200;
                res.setHeader('Content-type', 'text/html; charset=utf-8' );

                let countArr=[];
                img.forEach((item,index)=>{
                    countArr.push(index);
                })

                res.write('<div>');
                res.write('<div>'+JSON.stringify(delayArr)+'</div>');
                res.write('<div>['+countArr.join(',')+']</div>');
                const imageEncoded1x = UPNG.encode(img,imgObj.width,imgObj.height,0,delayArr);
                const base64String1x = Buffer.from(imageEncoded1x, 'binary').toString('base64');
                res.write('<div style="display: inline-block"><img src="data:image/png;base64,'+base64String1x+'" alt="" /><br/><p style="text-align: center">1x</p></div>');

                const imageEncoded5x = UPNG.encode(img,imgObj.width,imgObj.height,0,delayArr.map(val=>val*5));
                const base64String5x = Buffer.from(imageEncoded5x, 'binary').toString('base64');
                res.write('<div style="display: inline-block"><img src="data:image/png;base64,'+base64String5x+'" alt="" /><br/><p style="text-align: center">5x</p></div>');
                res.write('<br/></div>');

                img.forEach((frame,i)=>{
                    const imageEncoded = UPNG.encode([img[i]],imgObj.width,imgObj.height,0,[delayArr[i]]);
                    const base64String = Buffer.from(imageEncoded, 'binary').toString('base64');
                    res.write('<div style="display: inline-block"><p>'+i+'</p><br/><img src="data:image/png;base64,'+base64String+'" alt="" /><br/><p style="text-align: center">'+delayArr[i]+'</p></div>');
                })
                res.end();
            }
        });
    });


}).listen(parseInt(port));

console.log(`breakdown server listening on port ${port}`);