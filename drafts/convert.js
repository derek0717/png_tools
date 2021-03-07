const fs = require('fs')
let UPNG = require('@pdf-lib/upng').default;
var inputPath = "downloadFolder/stickerpack@2x/animation@2x/";
var outputPath = "outputFolder/";

fs.readdir(inputPath, function (err, files) {
    if (err) {
        console.error("Could not list the directory.", err);
        process.exit(1);
    }
    files.forEach(function (file, index) {
        if(!file.match(/.*\.png$/)) {
            console.log(file+' not png. skipping');
            return;
        }
        let imgBuffer = fs.readFileSync(inputPath+file).buffer;
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
        let redImgReady = UPNG.encode(frames,Math.max(originalWidth,originalHeight),Math.max(originalWidth,originalHeight),0,delayArr);
        let buffer = new Buffer( redImgReady )
        let is256='';
        if(buffer.length>(1024*300)){
            redImgReady = UPNG.encode(frames,Math.max(originalWidth,originalHeight),Math.max(originalWidth,originalHeight),256,delayArr);
            buffer = new Buffer( redImgReady )
            is256='*';
        }
        let write = fs.createWriteStream(outputPath+file);
        write.write(buffer);
        write.end();
        console.log('done '+file+is256);
    })
    console.log('all done.');

    fs.rmdir(outputPath, { recursive: true })
        .then(() => console.log('directory removed!'));
})