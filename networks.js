#!/home/monitor/.nvm/versions/node/v10.7.0/bin/node

const fs = require('fs')
fs.writeFileSync('/run/monitor/monitor.networks.pid',process.pid)

const common = require('../common/lib')

var redis = require("redis")
var db = redis.createClient()

var express = require('express')
var app = express()

// check inputs

const networks = require('../config/ip.networks')

function fatal(text,elt) {
  console.error('MONITOR NETWORKS ERROR',text,elt)
  process.exit(1)
}

if(!networks.nets24) { return fatal('networks'); }

for(var ip in networks.nets24) {
  const net = networks.nets24[ip]
  if(!net.tag) { return fatal('nets24 notag',ip); }
  if(!net.rtr) { return fatal('nets24 nortr',ip); }
  if(!common.ip24.test(ip)) { return fatal('nets24 ip',ip); }
  if(!common.tags.test(net.tag)) { return fatal('nets24 tag',ip); }
  if(!common.rtrs.test(net.rtr)) { return fatal('nets24 rtr',ip); }
  //console.log('network /24',ip,net.tag,net.transit)
}

// donets24

function donets24() {
  for(var ip in networks.nets24) {
    const net = networks.nets24[ip]
    //console.log('network24',ip)
    db.publish('network24',ip+' '+net.tag+' '+net.rtr+' '+net.rtt)
  }
}

// donets32

function donets32() {
  for(var ip in networks.nets24) {
    const pfx = ip.slice(0,-1)
    for(var i=0;i<256;i++) {
      db.publish('network32',pfx+i);
    }
  }
}

// loop

const sub = redis.createClient()
sub.on("message",function(channel,message) {
  if(channel!=="monitor") { return; }
  if(message!=="networks") { return; }
  donets24();
  donets32();
})
sub.subscribe('monitor')

// api

app.get('/',function(req,res,next) {
  res.setHeader('Content-Type','application/json')
  res.send(JSON.stringify(networks.nets24))
})

app.listen(3020)

console.log('networks')
