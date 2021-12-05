const http = require("http");
const url = require('url');
const fs = require("fs");

let linePackId = process.argv[2] || '';

http.createServer(function (req, res) {

    const parsedUrl = url.parse(req.url)
    let pathname = parsedUrl.pathname;

    const readPath = "./_output"+pathname;

    const html1='<div class="sticker-cell" style="display:inline-block"><img src="',
        html2='" alt="',
        html3='" /><br/><p>',
        html4='</p></div>';

    fs.readdir(readPath, function (err, files) {
        if (err) {
            // console.error('Could not read directory.', err);
            // throw err;
            res.writeHead(404)
            res.end('sticker folder not found');
            return;
        }

        if(files.length<1){
            res.writeHead(404)
            res.end('no sticker files');
            return
        }

        res.writeHead(200)

        res.write('<html lang="en"><head><title>'+pathname+'</title><style>.sticker-cell:nth-child(2n){background-color:#eee}</style></head><body style="margin:0;width:100%;">')

        files.forEach(function (file, index) {
            if(!file.match(/^.*\.png$/)) {
                return;
            }
            let thisStickerFilePath = 'http://localhost:9000/_output'+pathname+'/'+file;
            res.write(html1+thisStickerFilePath+html2+file+html3+(pathname.split("/")[1])+"/"+file+html4)
        });
        res.write('</body></html>')
        res.end();
    });

}).listen(8080, ()=>console.log('Start server on 8080'));

/* run file server */
require('./modules/fileserver')

const mainpagePath = 'http://localhost:8080' + ((linePackId!='')?('/'+linePackId):'');

require('child_process').exec((process.platform.replace('darwin','').replace(/win32|linux/,'xdg-') + 'open ' + mainpagePath));