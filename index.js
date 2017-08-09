const net = require('net');
const Promise = require('promise');

   
function ClientQuery() {
  this.state = 0; /* <0 Not connected | 1 Connecting | 2 Connected no auth | 3 Connected and auth | 4 Connection Failed> */
  this.actions = {};
  this.actionsLastCall = {};
  this.debug = true;
  this.onMessage = function(data){};

  this.log = function(msg) {
    if(!this.debug) {console.log(msg)}
  }

  this.parse = function(res) {
    let rawStrings = res.toString().split("|")
    let parsedObjects = [];
    rawStrings.forEach(function(str) {
      let tempobj = {};
      str.split('\n\r')[0].split(" ").forEach(function(vari) {
        if(vari.indexOf("=") > -1) {
          tempobj[vari.split("=")[0]] = vari.split("=")[1].replaceAll("\\\\s", " ");
        }
      })
      if(rawStrings.length > 1) {
        parsedObjects.push(tempobj)
      } else {
        parsedObjects = tempobj;
      }
    }, this);
    return parsedObjects;
  }

  this.handleMessage = function(msg) {
    this.log(this.actions)
    if(this.actions.hasOwnProperty(msg.toString().split(" ")[0])) {
      if(this.actionsLastCall[msg.toString().split(" ")[0]] != msg.toString()) {
        this.actionsLastCall[msg.toString().split(" ")[0]] = msg.toString();
        this.actions[msg.toString().split(" ")[0]](msg);
      }
    } else {
      this.onMessage(msg);
    }
  }.bind(this)

  this.notifyOn = function(action, args, callback) {
    if(this.actions[action] == callback) {
      return;
    }
    console.log('meme')
    this.actions[action] = callback;    
    this.send(`clientnotifyregister event=${action} ${args}`)
  }

  this.notifyOff = function(action, args) {
    this.send(`clientnotifyunregister event=${action} ${args}`)
      .then(()=>{
        this.actions[action] = undefined;
      })
  }

  this.request = function(data) {
    this.log('Request: ' + data)
    return new Promise(function (resolve, reject) {
      this.sock.write(data + '\n', 'utf8', (res) => {
        this.log('Sent: '+data)

        let func = (data) => {
          if(data.toString() != 'error id=0 msg=ok\n\r') {
            resolve(data)
            this.sock.removeListener('data', func)
            this.sock.on('data', this.handleMessage)
          }
        }

        this.sock.removeListener('data', this.handleMessage)
        this.sock.on('data', func)
      })
    }.bind(this));
  }

  this.send = function(data) {
    this.log('Send: ' + data)
    return new Promise(function (resolve, reject) {
      this.sock.write(data + '\n', 'utf8', (res) => {
        this.log('Sent: '+data)
        resolve(res)
      })
    }.bind(this));
  }

  this.connect = function(host, port, apikey){
    return new Promise(function (resolve, reject) {
      this.state = 1;
      let sock = this.sock = new net.Socket();
      sock.connect(port, host);

      sock.on('connect', () => {
        this.state = 2;
        this.log('connected');
        this.send(`auth apikey=${apikey}`)
          .then(()=>{
            resolve(this)
            this.state = 3;
          })
      });

      sock.on('data', this.handleMessage);
    }.bind(this));
  }
}

module.exports = {
    newQuery: function() {return new ClientQuery()}
}