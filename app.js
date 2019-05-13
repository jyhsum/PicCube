const express = require('express');
const app = express();
const mysql = require("./util/mysqlcon.js");
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const config = require('./config/development_config');
const secret = config.config.secret;
const fs = require('fs');
const dao={
  hot_image:require("./dao/hot_pic.js"),
  edit_like_image:require("./dao/image_like.js"),
  broken_image:require("./dao/broken_image.js")
};

const privateKey  = fs.readFileSync(__dirname + '/ssl/private.key');
const certificate = fs.readFileSync(__dirname + '/ssl/certificate.crt');
const https = require('https');
const credentials = { key: privateKey, cert: certificate };

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(express.static('public'));


app.get('/hot_image', function(_req, res) {
  dao.hot_image.get()
  .then(function(data){
		res.send({data:data});
	}).catch(function(error){
		res.send({error:error});
	});
});

app.post('/edit_like_image', function(req, res) {
  const time = Math.floor(Date.now() / 1000);
  const list = req.body;
  let token = req.headers.authorization;
  if (token && token.length>7) {
    token = req.headers.authorization.slice(7);
  }
  jwt.verify(token, secret, function (err, decoded) {
    if (err) {
      // wrong password
      tokenResult = false;
      res.send({status: 403, note: 'Wrong token.'});
    } 
    else if (decoded.exp <= time) {
      // token expired
      tokenResult = false;
      res.send({status: 408, note: 'Session expired.'});
    } 
    else {
      // login successed
      tokenResult = decoded.data; // email
      if (list.length>0) {
        like_unlike_list(list, tokenResult).then(function(result) {
          const like_list = result.like_list;
          const unlike_list = result.unlike_list;
          const insert_image_like = 'INSERT INTO image_like(`image_id`,`email`)VALUES  ?';
          const delete_image_like = 'DELETE FROM image_like WHERE (image_id,email) IN (?)';
          if (like_list.length>0 && unlike_list.length>0) { // 在同一個頁面同時點了喜歡跟不喜歡   
            dao.edit_like_image.add_like_image(insert_image_like,like_list).then(function(result) {
              dao.edit_like_image.delete_like_image(delete_image_like,unlike_list).catch(function(error){
                console.log({error:error});
              });
            }).catch(function(error){
              console.log({error:error});
            });
          }
          else if (like_list.length>0 && unlike_list.length==0) {
            dao.edit_like_image.add_like_image(insert_image_like,like_list).catch(function(error){
              console.log({error:error});
            });
          }
          else {
            dao.edit_like_image.delete_like_image(delete_image_like,unlike_list).catch(function(error){
              console.log({error:error});
            });
          }
        });
      }       
    }
  });
});
// Adjusted process to handle broken images. Save image_id in broken_image table and delete data from image_data.
app.post('/delete_broken_image', function(req, _res) {
  console.log('delete_broken_image');
  let broken_image_id;
  if (req.body.broken_id) {
    broken_image_id = JSON.parse(req.body.broken_id);
  }
  broken_list(broken_image_id).then(function(result) {
    const broken_id_list = result;
    const insert_id_list = broken_id_list.insert_list;
    const delete_id_list = broken_id_list.delete_list;
    dao.broken_image.save_broken_id(insert_id_list).then(function() {
      dao.broken_image.delete_broken_image(delete_id_list).then(function() {
        dao.broken_image.delete_image_like(delete_id_list).then(function() {

        }).catch(function(error){
            console.log({error:error});
          });
      }).catch(function(error){
          console.log({error:error});
        });
    }).catch(function(error){
        console.log({error:error});
      });
  });
});


function broken_list(data) {
  return new Promise((mainResolve, _mainReject) => {
    const delete_list = [];
    const insert_list = [];
    for (let i=0;i<data.length;i++) {
      delete_list.push(data[i].image_id);
      insert_list[i]=[data[i].image_id];
    }
    return mainResolve({delete_list: delete_list, insert_list: insert_list});
  });
}

function like_unlike_list(data, email) {
  return new Promise((mainResolve, _mainReject) => {
    const like_list=[];
    const unlike_list=[];
    for (let i=0;i<data.length;i++) {
      if (data[i].action=='add_like') {
        like_list.push([data[i].image_id, email]);
      }
      else {
        unlike_list.push([data[i].image_id, email]);
      }
    }
    return mainResolve({like_list: like_list, unlike_list: unlike_list||null, email: email});
  });
}



//var server = app.listen(80, function() {
//  var host = server.address().address
//  var port = server.address().port
//  console.log("http://%s:%s", host, port)

//});


var httpsServer = https.createServer(credentials, app);
httpsServer.listen(443, function () {
    console.log('listening on port 443!');
});



const search_route = require("./routes/search.js");
app.use("/photo",search_route);
const member_route = require("./routes/member.js");
app.use("/member",member_route);

