const fs = require('fs')
let UPNG = require('@pdf-lib/upng').default;
// console.log(typeof UPNG.decode)
// console.log(Object.keys(UPNG));

function printKeyAndValue(input, keys){
    keys.forEach(key=>{
        console.log(key+'('+(typeof input[key])+')'+': '+input[key]);
    })
}

let imgBuffer = fs.readFileSync('input/drafts/354631515@2x.png').buffer;
const imgObj = UPNG.decode(imgBuffer);
const originalWidth=imgObj.width,
      originalHeight=imgObj.height;
let delayArr = imgObj.frames.map(value=>{
    return value.delay
});
// console.log(Object.keys(imgObj));
printKeyAndValue(imgObj, ['width','height','depth','ctype'])
let img = UPNG.toRGBA8(imgObj);
console.log(Object.keys(img));
const rgba8Frame = img[1];
console.log(rgba8Frame);

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
        console.log('h > w')
        console.log('h > w')
        console.log('h > w')
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
})

let redImgReady = UPNG.encode(frames,Math.max(originalWidth,originalHeight),Math.max(originalWidth,originalHeight),0,delayArr);

let all = fs.createWriteStream("out.png");
let buffer = new Buffer( redImgReady )
all.write(buffer);
all.end();
console.log('finished');