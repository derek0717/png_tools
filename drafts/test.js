const fs = require('fs')

if (!fs.existsSync('./temp')){
    fs.mkdirSync('./temp');
}
fs.rmdir('./temp', { recursive: true },function(){
    console.log('directory removed!')
})