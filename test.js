const tssc = require('./index');
const fs = require('fs');
const apikey = fs.readFileSync('./apikey.txt').toString();
console.log(apikey)

var client = tssc.newQuery()

client.connect('127.0.0.1', '25639', apikey)
    .then((data)=>{
        console.log('data')
        client.notifyOn('notifytalkstatuschange', 'schandlerid=1', (res)=>{
            console.log(res.toString())
        })
    })