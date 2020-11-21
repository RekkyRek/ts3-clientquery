const tssc = require('./index');
const fs = require('fs');
const apikey = fs.readFileSync('./apikey.txt').toString();
console.log(apikey)

var client = tssc.newQuery()

client.connect('127.0.0.1', '25639', apikey)
    .then((data)=>{
        client.request('clientlist')
            .then((res)=>{
            console.log(res.toString())
        });
    })