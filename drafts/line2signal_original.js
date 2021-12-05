const fs = require('fs')
const https = require('https')
const path = require('path');
const UPNG = require('@pdf-lib/upng').default;
const AdmZip = require('adm-zip');

var outputPath = "output";

let linePackId = process.argv[2];
let dynamicType = process.argv[3] || false;
if(!linePackId) {console.log('no Line sticker pack ID'); return;}
var unzipPath = "./temp/stickerpack";
var staticUnzipPath = "./temp/sticker";
var inputPath = "./temp/stickerpack/animation@2x";
if(dynamicType=='popup'){
    inputPath = "./temp/stickerpack/popup";
}
var staticInputPath = "./temp/sticker";
const linePackPath = "https://stickershop.line-scdn.net/stickershop/v1/product/"+linePackId+"/iphone/stickerpack@2x.zip";
const lineStaticPackPath = "https://stickershop.line-scdn.net/stickershop/v1/product/"+linePackId+"/iphone/stickers@2x.zip";
if (fs.existsSync('./output')){
    fs.rmdir('./output', { recursive: true },function(){
            fs.mkdirSync('./output');
    });
} else {
    fs.mkdirSync('./output');
}
if (fs.existsSync('./temp')){
    fs.rmdir('./temp', { recursive: true },function(){
        fs.mkdirSync('./temp');
    });
} else {
    fs.mkdirSync('./temp');
}

https.get(linePackPath, function(response) {
    response.pipe(fs.createWriteStream("./temp/stickerpack.zip")).on('close', function(){
        console.log('downloaded');
        var fileSizeInBytes = (fs.statSync("./temp/stickerpack.zip")).size
        console.log('size: '+fileSizeInBytes+' bytes');
        if(fileSizeInBytes<11111){
            // static
            console.log('Animation package not found, downloading static package')
            fs.unlinkSync("./temp/stickerpack.zip")
            https.get(lineStaticPackPath, function(response) {
                response.pipe(fs.createWriteStream("./temp/sticker.zip")).on('close', function () {
                    console.log('downloaded');
                    const admZipFile = new AdmZip("./temp/sticker.zip");
                    admZipFile.extractAllTo(staticUnzipPath, true);
                    console.log('unzipped')
                    fs.readdir(staticInputPath, function (err, files) {
                        if (err) {
                            console.error("Could not list the directory.", err);
                            process.exit(1);
                        }
                        files.forEach(function (file, index) {
                            if (!file.match(/^[0-9]*@2x\.png$/)) {
                                return;
                            }
                            fs.copyFileSync(path.join(staticInputPath, file), path.join(outputPath, file), (err) => {
                                if (err) {
                                    console.error("failed to copy "+file, err);
                                    throw err;
                                }
                            });
                            console.log('copied '+file);
                        });
                        console.log('static all done.');
                        fs.rmdir('./temp', { recursive: true },function(){
                            return;
                        })
                    });
                })
            });
        } else {
            // animation
            const admZipFile = new AdmZip("./temp/stickerpack.zip");
            admZipFile.extractAllTo(unzipPath, true);
            console.log('unzipped')
            fs.readdir(inputPath, function (err, files) {
                if (err) {
                    console.error("Could not list input directory.", err);
                    throw err;
                }
                files.forEach(function (file, index) {
                    if(!file.match(/^.*\.png$/)) {
                        console.log(file+' not png. skipping');
                        return;
                    }
                    let imgBuffer = fs.readFileSync(path.join(inputPath, file)).buffer;
                    const imgObj = UPNG.decode(imgBuffer);
                    const originalWidth=imgObj.width,
                        originalHeight=imgObj.height;
                    const delayArr = imgObj.frames.map(value=>{
                        return value.delay
                    });
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
                            let emptyRow = new Uint8Array(originalWidth * 4)
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
                    let pngOut = fs.createWriteStream(path.join(outputPath, file));
                    pngOut.write(buffer);
                    pngOut.end();
                    console.log('processed '+file+sizePostfix);
                })
                console.log('all done.');
                fs.rmdir('./temp', { recursive: true },function(){
                    return;
                })
            });
        }
    });
});
