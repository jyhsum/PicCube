const express = require('express');
const app = express();
const mysql = require("./util/mysqlcon.js");
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const config = require('./config/development_config');
const secret = config.config.secret;
const fs = require('fs');

const privateKey  = fs.readFileSync(__dirname + '/ssl/private.key');
const certificate = fs.readFileSync(__dirname + '/ssl/certificate.crt');
const https = require('https');
const credentials = { key: privateKey, cert: certificate };

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(express.static('public'));

app.post('/edit_like_image', function(req, res) {
  const time = Math.floor(Date.now() / 1000);
  let list = req.body;
  let token = req.headers.authorization.slice(7);
  jwt.verify(token, secret, function (err, decoded) {
    if (err) {
      // wrong password
      tokenResult = false;
      res.send({status:403,note:"Wrong token."});
    } 
    else if (decoded.exp <= time) {
      //token expired
      tokenResult = false;
      res.send({status:408,note:"Session expired."});
    } 
    else{
      //login successed
      tokenResult = decoded.data; //email
      if(list.length>0){
        like_unlike_list(list,tokenResult).then(function(result){
          let like_list = result.like_list;
          let unlike_list = result.unlike_list;
          let insert_image_like = 'INSERT INTO image_like(`image_id`,`email`)VALUES  ?';
          let delete_image_like = 'DELETE FROM image_like WHERE (image_id,email) IN (?)';

          if(like_list.length>0 && unlike_list.length>0){ //在同一個頁面同時點了喜歡跟不喜歡     
            mysql.pool.getConnection(function(error, connection) {
              if(error){
                console.log(error);
                res.send({error:"Error in connection database."});
              }    
              connection.query(insert_image_like, [like_list], function(error, result, fields){
                connection.release();
                if(error){
                  console.log(error);
                  res.send({error:"Query image_like Error"});
                }
                else{                  
                  console.log("Added like_list success:"+like_list);
                  connection.query(delete_image_like, [unlike_list] , function(error, result, fields){                   
                    if(error){
                      console.log(error);
                      res.send({error:"Query image_like Error"});
                    }
                    else{                    
                      console.log("Delete unlike_list success:"+unlike_list);
                      res.send({status:200, note:"Modify like_list success"});
                    }
                  }); 
                }
              });
            });
          }
          else if(like_list.length>0 && unlike_list.length==0){
            mysql.pool.getConnection(function(error, connection) {
              if(error){
                console.log(error);
                res.send({error:"Error in connection database."});
              }
              connection.query(insert_image_like, [like_list], function(error, result, fields){
                connection.release();
                if(error){
                  console.log(error);
                  res.send({error:"Query image_like Error"});
                }
                else{
                  console.log("Added like_list success:"+like_list);
                }
              });
            });
          }
          else{
            mysql.pool.getConnection(function(error, connection) {
              if(error){
                console.log(error);
                res.send({error:"Error in connection database."});
              }
              connection.query(delete_image_like, [unlike_list] , function(error, query_result, fields){
                connection.release();
                if(error){
                  console.log(error);
                  res.send({error:"Query image_like Error"});
                }
                else{
                  console.log("Delete unlike_list success:"+unlike_list);
                  res.send({status:200, note:"Delete like_list success"});
                }
              }); 
            });
          }         
        });
      }
    }
  })
});


app.get('/hot_image', function(req, res) {
  //'SELECT * FROM `image_data` AS A LEFT JOIN `image_author` AS B ON A.`image_id` = B.`image_id` ORDER BY `likes` DESC limit 25;'
  let query_hot = 'SELECT * , count(A.`image_id`) AS likes FROM `image_like` AS A INNER JOIN `image_data` AS B ON A.`image_id` = B.`image_id` GROUP BY A.`image_id` ORDER BY likes DESC limit 30;';
  mysql.pool.getConnection(function(error, connection) {
    if(error){
      console.log(error);
      res.send({error:"Error in connection database."});
    }
    console.log('connected as id ' + connection.threadId);
    connection.query( query_hot, function(error, result, fields){
      connection.release();
      if(error){
        console.log(error);
        res.send({error:"Query image_data Error."});
      }
      else{
        res.send({data:result});
      }
    });
    
  });
});


//Adjusted process to handle broken images. Save image_id in broken_image table and delete data from image_data.
app.post('/delete_broken_image', function(req, res) {
  console.log("delete_broken_image");
  let broken_image_id;
  if(req.body.broken_id){
    broken_image_id = JSON.parse(req.body.broken_id);
  }
  broken_list(broken_image_id).then(function(result){
    let broken_id_list = result;
    let save_broken_id = "INSERT INTO broken_image(`image_id`)VALUES ?";
    let insert_id_list = broken_id_list.insert_list;
    let delete_id_list = broken_id_list.delete_list;
    mysql.pool.getConnection(function(error, connection) {
      if(error){
        console.log(error);
        console.log({error:"Error in connection database."});
        connection.release();
      }
      connection.query(save_broken_id, [insert_id_list] , function(error, save_broken_id_result, fields){
        if(error){
          console.log(error);
          console.log({error:"Insert save_broken_id Error"});
          connection.release();
        }
        else{
          let delete_image_data = 'DELETE FROM image_data WHERE (`image_id`) IN (?)';
          let delete_image_like = 'DELETE FROM image_like WHERE (`image_id`) IN (?)';
          mysql.pool.getConnection(function(error, connection) {
            if(error){
              console.log(error);
              console.log({error:"Error in connection database."});
              connection.release();
            }
            connection.query(delete_image_data, [delete_id_list] , function(error, delete_image_data_result, fields){
              if(error){
                console.log(error);
                console.log({error:"Delete image_data Error"});
                connection.release();
              }
              else{
                connection.query(delete_image_like, [delete_id_list] , function(error, delete_image_like_result, fields){ 
                  if(error){
                    console.log(error);
                    console.log({error:"Delete image_like Error"});
                    connection.release();
                  }
                  else{
                    connection.release();
                  }
                });
              }
            });
          });
        }
      });
    });
  });
});






function broken_list(data){
  return new Promise((mainResolve, mainReject) => {
    let delete_list = [];
    let insert_list = [];
    for(let i=0;i<data.length;i++){
      delete_list.push(data[i].image_id);
      insert_list[i]=[data[i].image_id];
    }
    return mainResolve({delete_list:delete_list,insert_list:insert_list});
  });
}







function like_unlike_list(data,email){
  return new Promise((mainResolve, mainReject) => {
    let like_list=[];
    let unlike_list=[];
    for(let i=0;i<data.length;i++){
      if(data[i].action=='add_like'){
        like_list.push([data[i].image_id,email]);
      }
      else{
        unlike_list.push([data[i].image_id,email]);
      }
    }
    return mainResolve({like_list:like_list,unlike_list:unlike_list||null,email:email})
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

