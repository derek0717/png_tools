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
console.log(originalWidth)
console.log(originalHeight)

// console.log(Object.keys(imgObj));
printKeyAndValue(imgObj, ['width','height','depth','ctype','frames','tabs'])
console.log(JSON.stringify(imgObj.frames[0]));
imgObj.frames.forEach((frame, index)=>{
    console.log('--------')
    console.log('frame '+index)
    console.log('x: '+frame.rect.x+' y: '+frame.rect.y)
    console.log('w: '+frame.rect.width+ ' h: '+frame.rect.height)
    console.log('delay: '+frame.delay)
    console.log('dispose: '+frame.dispose)
    console.log('blend: '+frame.blend)
})
