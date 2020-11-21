const net = require('net');
const Promise = require('promise');

   
function ClientQuery() {
  this.state = 0; /* <0 Not connected | 1 Connecting | 2 Connected no auth | 3 Connected and auth | 4 Connection Failed> */
  let actions = this.actions = {};
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
          tempobj[vari.split("=")[0]] = vari.substring(vari.indexOf('=')+1, vari.length).replaceAll("\\\\s", " ");
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
    console.log('Register notify '+action)
    this.actions[action] = callback;
    this.send(`clientnotifyregister event=${action} ${args}`)
  }

  this.notifyOff = function(action, args) {
    console.log('Unregister notify '+action)
    this.send(`clientnotifyunregister event=${action} ${args}`)
      .then(()=>{
        this.actions[action] = undefined;
      })
  }

  this.request = function (data) {
    this.log('Request: ' + data)
    return new Promise(function (resolve, reject) {
        let recived = "";
        let func = (data) => {
            var datastr = data.toString();
            if ( datastr.includes('error id=') ) {
                resolve(datastr);
                this.sock.removeListener('data', func);
                this.sock.on('data', this.handleMessage);
            }else{
                recived += datastr;
            }
        }
        this.sock.removeListener('data', this.handleMessage);
        this.sock.on('data', func);
        this.sock.write(data + '\n', 'utf8', (res) => {
            console.log('Sent: ' + data);
        })
    }.bind(this));
  }

  this.send = function(data) {
    this.log('Send: ' + data)
    this.sock.removeListener('data', this.handleMessage)
    this.sock.on('data', this.handleMessage)
    return new Promise(function (resolve, reject) {
      this.sock.write(data + '\n', 'utf8', (res) => {
        this.log('Sent: '+data)
        resolve(res)
      })
    }.bind(this));
  }

  this.reInitActions = function() {
    let act = this.actions;
    console.log('actions', Object.keys(act))
    Object.keys(act).forEach(function(key) {
        console.log('addNotifyMemes Lol', key, 'schandlerid=1', typeof(act[key]))
        this.notifyOn(key, 'schandlerid=1', act[key])
    }.bind(this));
  }

  this.reconnects = 0;

  setInterval(()=>{
    this.reconnects--;
  }, 1000);

  this.connect = function(host, port, apikey) {
    return new Promise(function (resolve, reject) {
      if(this.reconnects < 5) {
        this.reconnects++;
        this.state = 1;
        let sock = this.sock = new net.Socket();

        sock.connect(port, host);

        sock.on('connect', () => {
          this.state = 2;
          sock.setTimeout(0);
          this.log('connected');
          this.request(`auth apikey=${apikey}`)
          .then((resp) => {
              if (resp.includes('id=0')) {
                  resolve(this);
                  this.state = 3;
                  setTimeout(() => {
                      this.reInitActions(actions);
                  }, 100);
              }else{
                  reject("Error connecting");
              }
          });
        });
        
        sock.on('close', () => {
          console.log('con closed, reopen')
          sock.destroy();
          this.connect(port, host, apikey);
        });

        sock.on('data', this.handleMessage);
      } else {
        setTimeout(() => {this.connect(host, port, apikey)}, 3000);
      }
    }.bind(this));
  }
}

module.exports = {
    newQuery: function() {return new ClientQuery()}
}
