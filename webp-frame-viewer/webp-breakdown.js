/*
 * node breakdownserver-webp.js
 * then go to:
 * http://localhost:9000/path/to/file.webp
 */

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const WebP = require('node-webpmux'); // CommonJS safe

const port = process.argv[2] || 9001;

http.createServer(async function (req, res) {
    const parsedUrl = url.parse(req.url);
    let pathname = `.${parsedUrl.pathname}`;
    const ext = path.parse(pathname).ext.toLowerCase();

    if (ext !== '.webp') {
        res.statusCode = 400;
        return res.end('Only .webp supported here');
    }

    fs.exists(pathname, async function (exist) {
        if (!exist) {
            res.statusCode = 404;
            return res.end(`File ${pathname} not found!`);
        }

        try {
            const buffer = fs.readFileSync(pathname);

            // Load animated webp
            const img = new WebP.Image();
            await img.load(buffer);

            if (!img.data || !img.data.extended) {
                res.statusCode = 400;
                return res.end('Invalid WebP: no extended header (not animated or corrupted)');
            }

            if (!img.data.extended || !img.hasAnim) {
                res.statusCode = 400;
                return res.end('Not a valid animated WebP');
            }

            const frames = img.frames;
            const width = img.width;
            const height = img.height;

            // Extract delays
            const delayArr = frames.map(f => f.delay);

            res.statusCode = 200;
            res.setHeader('Content-type', 'text/html; charset=utf-8');

            res.write('<div>');
            res.write(`<div>${pathname}</div>`);
            res.write(`<div>${JSON.stringify(delayArr)}</div>`);
            res.write(`<div>[${frames.map((_, i) => i).join(',')}]</div>`);

            // Rebuild animation 1x + 5x (important: preserve ordering + timing)
            const rebuild = async (multiplier) => {
                const newImg = new WebP.Image();
                newImg.width = width;
                newImg.height = height;

                const newFrames = [];

                for (let f of frames) {
                    newFrames.push({
                        image: f.image,
                        delay: f.delay * multiplier,
                        x: f.x,
                        y: f.y,
                        dispose: f.dispose,
                        blend: f.blend
                    });
                }

                newImg.frames = newFrames;
                newImg.anim = { loop: img.anim.loop };

                return await newImg.save(null); // buffer
            };

            const buf1x = await rebuild(1);
            const buf5x = await rebuild(5);

            const base1 = Buffer.from(buf1x).toString('base64');
            const base5 = Buffer.from(buf5x).toString('base64');

            res.write(`
                <div style="display:inline-block">
                    <img src="data:image/webp;base64,${base1}" />
                    <p style="text-align:center">1x</p>
                </div>
            `);

            res.write(`
                <div style="display:inline-block">
                    <img src="data:image/webp;base64,${base5}" />
                    <p style="text-align:center">5x</p>
                </div>
            `);

            res.write('<br/>');

            // CRITICAL: output each frame correctly
            for (let i = 0; i < frames.length; i++) {
                const single = new WebP.Image();

                single.width = width;
                single.height = height;

                single.frames = [{
                    image: frames[i].image,
                    delay: delayArr[i],
                    x: frames[i].x,
                    y: frames[i].y,
                    dispose: frames[i].dispose,
                    blend: frames[i].blend
                }];

                single.anim = { loop: 0 };

                const buf = await single.save(null);
                const base64 = Buffer.from(buf).toString('base64');

                res.write(`
                    <div style="display:inline-block">
                        <p>${i}</p>
                        <img src="data:image/webp;base64,${base64}" />
                        <p style="text-align:center">${delayArr[i]} ms</p>
                    </div>
                `);
            }

            res.write('</div>');
            res.end();

        } catch (err) {
            res.statusCode = 500;
            res.end(`Error: ${err.message}`);
        }
    });

}).listen(parseInt(port));

console.log(`breakdown server listening on port ${port}`);