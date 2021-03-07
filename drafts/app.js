const fs = require('fs')
let UPNG = require('@pdf-lib/upng').default;
// console.log(typeof UPNG.decode)
console.log(Object.keys(UPNG));

function printKeyAndValue(input, keys){
    keys.forEach(key=>{
        console.log(key+'('+(typeof input[key])+')'+': '+input[key]);
    })
}

let imgBuffer = fs.readFileSync('./wadiu.png').buffer;
const imgObj = UPNG.decode(imgBuffer);
console.log(Object.keys(imgObj));
printKeyAndValue(imgObj, ['width','height','depth','ctype'])
let img = UPNG.toRGBA8(imgObj);
console.log(Object.keys(img));
const rgba8Frame = img[0];
console.log(rgba8Frame);
// try to reconstruct image
console.log('build new image');
// let newImgObj = UPNG.encode([rgba8Frame],692,760,0);

console.log('output image');
const pixel = new Uint8Array([255,0,0,255]);
const size = 100*100*4;
let redImg = new Uint8Array(size);
console.log(redImg)
redImg.set(pixel, 0);
console.log(redImg)
let redImgBuffer = redImg.buffer;
console.log('buffer')
console.log(redImgBuffer)
const redImgUnBuffer = Buffer.from(redImg);
console.log('unbuffer')
console.log(redImgUnBuffer)
console.log(redImgUnBuffer[0])
console.log(redImgUnBuffer[1])
console.log(redImgUnBuffer[2])
console.log(redImgUnBuffer[3])
redImgUnBuffer.set(pixel, 8)
console.log(redImgUnBuffer)
let reBuffer = redImgUnBuffer.buffer;
let redImgReady = UPNG.encode([reBuffer],100,100,0);

let all = fs.createWriteStream("out2.png");
let buffer = new Buffer( redImgReady )
all.write(buffer);
all.end();
console.log('finished');