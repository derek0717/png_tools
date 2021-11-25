const fs = require('fs')
const path = require('path');
const UPNG = require('@pdf-lib/upng').default;

const inputPath = "./unzipped/stickerpack/animation@2x"
const outputPath = "./frame_fixed"

let stickerFileName = process.argv[2];

if(!stickerFileName.match(/^.*\.png$/)) {
    console.log(stickerFileName+' not png. skipping');
    return;
}

// init folders
[ outputPath ].forEach(function(path){
    if (!fs.existsSync(path)){
        fs.mkdirSync(path);
    }
});

fs.readdir(inputPath, function (err, files) {
    if (err) {
        console.error("Could not list input directory.", err);
        throw err;
    }
    let imgBuffer = fs.readFileSync(path.join(inputPath, stickerFileName)).buffer;
    const imgObj = UPNG.decode(imgBuffer);
    const originalWidth=imgObj.width,
        originalHeight=imgObj.height;
    const delayArr = imgObj.frames.map(value=>{
        return value.delay
    });

    let delayPostfix = '';
    // update delayArr to add to last frame
    delayArr[delayArr.length-1] = (delayArr.reduce((acc,dis)=>(acc+dis)));
    delayPostfix = '_'+(delayArr[delayArr.length-1])
    console.log(JSON.stringify(delayArr))


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

    let outputFileName = stickerFileName.split('.')[0]+delayPostfix+'.'+stickerFileName.split('.')[1];

    let pngOut = fs.createWriteStream(path.join(outputPath, outputFileName));
    // will overwrite file with same filename
    pngOut.write(buffer);
    pngOut.end();
    console.log('processed ' + outputFileName + sizePostfix);

    console.log('all done.');
});