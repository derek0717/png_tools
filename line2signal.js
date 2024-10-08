/* downloads, unzips and processes stickers to square, save in output folder */
/* node line2signal 16361450 */
/* FOR EMOJI: node line2signal 66b40bab79287153b51755e9 emoji */

const fs = require('fs')
const https = require('https')
const path = require('path');
const UPNG = require('@pdf-lib/upng').default;
const AdmZip = require('adm-zip');

let linePackId = process.argv[2];
let dynamicType = process.argv[3] || false;
if(!linePackId) {console.log('no Line sticker pack ID'); return;}

const linePackRemotePath = 'https://stickershop.line-scdn.net/stickershop/v1/product/'+linePackId+'/iphone/stickerpack@2x.zip';
/* ref: https://greasyfork.org/en/scripts/39015-line-sticker-download/code */
const lineEmojiPackRemotePath = 'https://stickershop.line-scdn.net/sticonshop/v1/'+linePackId+'/sticon/iphone/package_animation.zip';
const lineStaticPackRemotePath = 'https://stickershop.line-scdn.net/stickershop/v1/product/'+linePackId+'/iphone/stickers@2x.zip';

const outputPath = './_output',
    downloadsPath = outputPath+'/downloads',
    zipPath = downloadsPath+'/zip',
    zipPackPath = zipPath+'/'+linePackId,
    unzippedPath = outputPath+'/unzipped',
    unzippedPackPath = unzippedPath+'/'+linePackId,
    unzippedAnimationPath = unzippedPackPath+'/stickerpack',
    unzippedStaticPath = unzippedPackPath+'/sticker',
    packOutputPath = outputPath+'/'+linePackId;

let animationInputPath = unzippedAnimationPath+'/animation@2x';
let remoteDownloadPath = linePackRemotePath;
if(dynamicType=='popup'){
    /* for popup style line animations */
    animationInputPath = unzippedAnimationPath+'/popup';
} else if (dynamicType=='emoji'){
    remoteDownloadPath = lineEmojiPackRemotePath;
    animationInputPath = unzippedAnimationPath;
}
const staticInputPath = unzippedStaticPath,
    animationZipFileName = 'stickerpack.zip',
    animationZipFileFullPath = zipPackPath+'/'+animationZipFileName,
    staticZipFileName = 'sticker.zip',
    staticZipFileFullPath = zipPackPath+'/'+staticZipFileName;

/* init folders */
function initFolder(path, removeExisting=false){
    if (!fs.existsSync(path)){
        fs.mkdirSync(path);
    } else {
        if(removeExisting){
            fs.rmdir(path, { recursive: true },function(){
                fs.mkdirSync(path);
            });
        }
    }
}

[ outputPath, downloadsPath, zipPath, zipPackPath, unzippedPath, unzippedPackPath, packOutputPath ].forEach(function(path){
    initFolder(path);
});

console.log('downloading pack '+linePackId+'...');

https.get(remoteDownloadPath, function(response) {
    response.pipe(fs.createWriteStream(animationZipFileFullPath)).on('close', function(){
        console.log('downloaded');
        var fileSizeInBytes = (fs.statSync(animationZipFileFullPath)).size
        console.log('size: '+fileSizeInBytes+' bytes');
        if(fileSizeInBytes<11111){
            // static
            console.log('NOT_FOUND: Animation package with id '+linePackId+' not found, downloading static package');
            fs.unlinkSync(animationZipFileFullPath)
            https.get(lineStaticPackRemotePath, function(response) {
                response.pipe(fs.createWriteStream(staticZipFileFullPath)).on('close', function () {
                    console.log('downloaded');
                    const admZipFile = new AdmZip(staticZipFileFullPath);
                    admZipFile.extractAllTo(unzippedStaticPath, true);
                    console.log('unzipped')
                    fs.readdir(staticInputPath, function (err, files) {
                        if (err) {
                            console.error('Could not list the directory.', err);
                            process.exit(1);
                        }
                        files.forEach(function (file, index) {
                            if (!file.match(/^[0-9]*@2x\.png$/)) {
                                return;
                            }
                            try {
                                fs.copyFileSync(path.join(staticInputPath, file), path.join(packOutputPath, file));
                            } catch (e){
                                console.error('failed to copy ' + file, err);
                                throw err;
                            }
                            console.log('copied '+file);
                        });
                        console.log('static all done.');
                        fs.rm(unzippedPackPath, { recursive: true },function(){
                            return;
                        })
                    });
                })
            });
        } else {
            // animation
            const admZipFile = new AdmZip(animationZipFileFullPath);
            admZipFile.extractAllTo(unzippedAnimationPath, true);
            console.log('unzipped')
            fs.readdir(animationInputPath, function (err, files) {
                if (err) {
                    console.error('Could not list input directory.', err);
                    throw err;
                }
                files.forEach(function (file, index) {
                    if(!file.match(/^.*\.png$/)) {
                        console.log(file+' not png. skipping');
                        return;
                    }
                    if(file.match(/^.*_key_animation.*$/)) {
                        console.log(file+' low quality _key_animation. skipping');
                        return;
                    }

                    let imgBuffer = fs.readFileSync(path.join(animationInputPath, file)).buffer;
                    const imgObj = UPNG.decode(imgBuffer);
                    const originalWidth=imgObj.width,
                        originalHeight=imgObj.height;
                    const delayArr = imgObj.frames.map(value=>{
                        return value.delay
                    });

                    // update delayArr to add to last frame if num_plays=1
                    let delayPostfix = '';
                    if (imgObj.tabs.acTL.num_plays<2){
                        delayArr[delayArr.length-1] = Math.min(700,(delayArr.reduce((acc,dis)=>(acc+dis))));
                        delayPostfix = ' d';
                    }


                    let img = UPNG.toRGBA8(imgObj);
                    function getSquareFrame(originalFrame){
                        if(originalWidth==originalHeight){
                            // already a square
                            return originalFrame;
                        }
                        const pixel = new Uint8Array([255,255,255,0]);
                        let outputImageArr;
                        if(originalWidth > originalHeight){
                            // add top and bottom
                            outputImageArr = new Uint8Array(originalWidth * originalWidth * 4);
                            let topEmptyCount = Math.floor((originalWidth - originalHeight)/2),
                                botEmptyCount = originalWidth - originalHeight - topEmptyCount;
                            for(let i=0; i<(originalWidth * topEmptyCount); i++){
                                outputImageArr.set(pixel, i * 4);
                            }
                            outputImageArr.set(Buffer.from(originalFrame), (originalWidth * topEmptyCount * 4));
                            for(let i=0; i<(originalWidth * botEmptyCount); i++){
                                outputImageArr.set(pixel, ((originalWidth * originalWidth)-i - 1) * 4);
                            }

                        } else {
                            // add to left and right side
                            outputImageArr = new Uint8Array(originalHeight * originalHeight * 4);
                            let leftEmptyCount = Math.floor((originalHeight-originalWidth)/2),
                                rightEmptyCount = originalHeight - originalWidth - leftEmptyCount;
                            const originalArr = Buffer.from(originalFrame);
                            let leftEmpty = new Uint8Array(leftEmptyCount * 4);
                            for(let i=0; i<leftEmptyCount; i++){
                                leftEmpty.set(pixel, i * 4);
                            }
                            let rightEmpty = new Uint8Array(rightEmptyCount * 4);
                            for(let i=0; i<rightEmptyCount; i++){
                                rightEmpty.set(pixel, i * 4);
                            }
                            for(let i=0; i<originalHeight; i++){
                                const originalRow = originalArr.subarray(originalWidth * i * 4, originalWidth * (i + 1) * 4);
                                outputImageArr.set(leftEmpty, i * originalHeight * 4);
                                outputImageArr.set(originalRow, (i * originalHeight + leftEmptyCount) * 4);
                                outputImageArr.set(rightEmpty, (i * originalHeight + leftEmptyCount + originalWidth) * 4);
                            }
                        }
                        return outputImageArr.buffer;
                    }
                    let frames = img.map(frame=>{
                        return getSquareFrame(frame)
                    });
                    let imageEncoded = UPNG.encode(frames,Math.max(originalWidth,originalHeight),Math.max(originalWidth,originalHeight),0,delayArr);
                    let buffer = Buffer.from( imageEncoded )
                    let sizePostfix='';
                    if(buffer.length>(1024*300)){
                        imageEncoded = UPNG.encode(frames,Math.max(originalWidth,originalHeight),Math.max(originalWidth,originalHeight),256,delayArr);
                        buffer = Buffer.from( imageEncoded )
                        sizePostfix='*';
                        if(buffer.length>(1024*300)){
                            imageEncoded = UPNG.encode(frames,Math.max(originalWidth,originalHeight),Math.max(originalWidth,originalHeight),128,delayArr);
                            buffer = Buffer.from( imageEncoded )
                            sizePostfix='**';
                            if(buffer.length>(1024*300)){
                                imageEncoded = UPNG.encode(frames,Math.max(originalWidth,originalHeight),Math.max(originalWidth,originalHeight),64,delayArr);
                                buffer = Buffer.from( imageEncoded )
                                sizePostfix='***';
                                if(buffer.length>(1024*300)){
                                    imageEncoded = UPNG.encode(frames,Math.max(originalWidth,originalHeight),Math.max(originalWidth,originalHeight),32,delayArr);
                                    buffer = Buffer.from( imageEncoded )
                                    sizePostfix='****';
                                    if(buffer.length>(1024*300)){
                                        imageEncoded = UPNG.encode(frames,Math.max(originalWidth,originalHeight),Math.max(originalWidth,originalHeight),16,delayArr);
                                        buffer = Buffer.from( imageEncoded )
                                        sizePostfix='*****';
                                        if(buffer.length>(1024*300)){
                                            imageEncoded = UPNG.encode(frames,Math.max(originalWidth,originalHeight),Math.max(originalWidth,originalHeight),8,delayArr);
                                            buffer = Buffer.from( imageEncoded )
                                            sizePostfix='***** *';
                                        }
                                    }
                                }
                            }
                        }
                    }
                    let pngOut = fs.createWriteStream(path.join(packOutputPath, file));
                    pngOut.write(buffer);
                    pngOut.end();
                    console.log('processed '+file+sizePostfix+delayPostfix);
                })
                fs.rmdir(zipPackPath, { recursive: true },function(){
                    console.log('zip folder removed')
                })
                fs.rmdir(unzippedPackPath, { recursive: true },function(){
                    console.log('unzipped folder removed')
                })
                console.log('all done.');
            });
        }
    });
});
