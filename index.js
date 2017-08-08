const net = require('net');
const Promise = require('promise');

   
function ClientQuery() {
  this.state = 0; /* <0 Not connected | 1 Connecting | 2 Connected no auth | 3 Connected and auth | 4 Connection Failed> */
  this.actions = {};
  this.debug = true;
  this.onMessage = function(data){};

  this.log = function(msg) {
    if(this.debug) {console.log(msg)}
  }

  this.handleMessage = function(msg) {
    if(this.actions.hasOwnProperty(msg.toString().split(" ")[0])) {
      this.actions[msg.toString().split(" ")[0]](msg);
    } else {
      this.onMessage(msg);
    }
  }.bind(this)

  this.notifyOn = function(action, args, callback) {
    this.send(`clientnotifyregister event=${action} ${args}`)
      .then(()=>{
        this.actions[action] = callback;
      })
  }

  this.notifyOff = function(action, args) {
    this.send(`clientnotifyunregister event=${action} ${args}`)
      .then(()=>{
        this.actions[action] = undefined;
      })
  }

  this.send = function(data) {
    this.log('Send: ' + data)
    return new Promise(function (resolve, reject) {
      this.sock.write(data + '\n', 'utf8', (res) => {
        this.log('Sent: '+data)
        resolve(res);
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
            this.state = 3;
            resolve(this)
          })
      });

      sock.on('data', this.handleMessage);
    }.bind(this));
  }
}

module.exports = {
    newQuery: function() {return new ClientQuery()}
}