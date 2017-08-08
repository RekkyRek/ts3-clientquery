const tssc = require('./index');
const fs = require('fs');
const apikey = fs.readFileSync('./apikey.txt').toString();
console.log(apikey)