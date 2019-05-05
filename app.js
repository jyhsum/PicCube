const express = require('express');
const app = express();
const superagent = require('superagent');
const charset = require('superagent-charset');
charset(superagent);
const cheerio = require('cheerio');
const request = require('request');
const Nightmare = require('nightmare');
const nightmare = Nightmare({ show: false, waitTimeout: 6000 });
const nightmareHelper = require("nightmare-helper");
const mysql = require("./util/mysqlcon.js");
const crypto = require('crypto');
const bodyParser = require('body-parser');
const search = require("./util/search.js");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('./config/development_config');
const path = require('path');
const secret = config.config.secret;
const fs = require('fs');
var privateKey  = fs.readFileSync(__dirname + '/ssl/private.key');
var certificate = fs.readFileSync(__dirname + '/ssl/certificate.crt');
//var chain = fs.readFileSync(__dirname + '/ssl/ca_bundle.crt');
var credentials = { key: privateKey, cert: certificate };
const multer = require('multer');
const AWS = require('aws-sdk');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const utf8 = require('utf8');
const https = require('https');


app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(express.static('public'));




app.post('/upload_user_pic',upload.single('upload_pic'), function(req, res) {
  const time = Math.floor(Date.now() / 1000);
  let token = req.headers.authorization.slice(7);  
  console.log(req.file);
  console.log(token);
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
      let tokenResult = decoded.data;  //email
      let query_userId = 'SELECT `user_id` FROM `user` WHERE `email` = "'+tokenResult+'";';
      mysql.pool.getConnection(function(error, connection) {
        if(error){
          console.log(error);
          res.send({error:"Error in connection database."});
        }
        connection.beginTransaction(function(error){
          if(error){
              connection.rollback();
              connection.release(); 
              console.log({error:"Error to begin transaction."});
          }
          connection.query(query_userId, function(error, result, fields){
            if(error){
              console.log(error);
              res.send({error:"Query image_data Error"});
            }
            else{
              connection.commit(function(error){
                if(error){
                  console.log({error:"Database Query Error"});
                  return mysql.con.rollback(function(){
                    throw error;
                  });
                }
                else{
                  let myDate = new Date();
                  let date = myDate.getTime();
                  let userId = result[0].user_id;
                  let file_name = 'id_'+userId+'_profile_picture_'+date;
                  //上傳到S3 並儲存圖片網址到資料庫
                  uploadToS3(req.file.buffer,file_name,userId).then (function(result){
                    res.send({status:200,note:"Update photo succesd."});
                  });
                  console.log("Insert data successed!");  
                  connection.release();
                }
              });
            }
          });
        });
      });
    }
  });  
});







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
    } else{
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
                  console.log("Added like_list success:");
                  console.log(like_list);
                  connection.query(delete_image_like, [unlike_list] , function(error, result, fields){
                    if(error){
                      console.log(error);
                      res.send({error:"Query image_like Error"});
                    }
                    else{
                      
                      console.log("Delete unlike_list success:");
                      console.log(unlike_list);
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
                  console.log("Added like_list success");
                  console.log(like_list);
                  
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
                  console.log("Delete unlike_list success:");
                  console.log(unlike_list);
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



app.post('/signup', function(req, res) {
  let email = req.body.email;
  let name = req.body.name;
  let password = bcrypt.hashSync(req.body.password, 10);
  let insert={
    email:req.body.email,
    password : password,
    provider: 'native',
    name:name
  };

  let insert_user_data = "insert into user SET ?";
  let query_user_data = "SELECT `email` FROM user WHERE `email`='"+email+"';"
    mysql.pool.getConnection(function(error, connection) {
      if(error){
        console.log(error);
        res.send({error:"Error in connection database."});
      }
      connection.query(query_user_data, function(error, repeat_results, fields){
        if(error){
          console.log(error);
          console.log({error:"Add user_data Error"});
          connection.rollback(function() {
            throw error;
          });
        }else if (repeat_results.length > 0) {
          res.send('信箱已註冊！');
        }
        else{
          connection.query(insert_user_data, insert, function(error, results, fields){
            connection.release();
            if(error){
              console.log(error);
              console.log({error:"Add user_data Error"});
              connection.rollback(function() {
                throw error;
              });
            }
            else{
              let token = jwt.sign({
                algorithm: 'HS256',
                exp: Math.floor(Date.now() / 1000) + (60 * 60), // token一個小時後過期。
                data: email
                }, secret);
                res.setHeader('Authorization', 'Bearer '+token);
                res.cookie('Authorization', token);
                res.redirect("/");
                // res.json({
                //     result: {
                //         status: "註冊成功。",
                //         loginMember: "歡迎 " + name + " 的登入！"
                //     }
                // });
            }
          });
        }
      });
    });
});






app.post('/signin', function(req, res) {
  console.log(req.body);
  let email = req.body.email;
  let password = req.body.password;

  let query_user_data = "SELECT * FROM user WHERE `email`='"+email+"';"
  mysql.pool.getConnection(function(error, connection) {
    if(error){
      res.send({error:"Error in connection database."});
    }
    connection.query(query_user_data, function(error, result, fields){
      connection.release();
      if(error){
        console.log({error:"Add user_data Error"});
        connection.rollback(function() {
          throw error;
        });
      }
      else if (result.length > 0) { 
          let compare_result = bcrypt.compareSync(password, result[0].password);
          if(compare_result){
            let token = jwt.sign({
              algorithm: 'HS256',
              exp: Math.floor(Date.now() / 1000) + (60 * 60), // token一個小時後過期。
              data: email
              }, secret);
            res.setHeader('Authorization', 'Bearer '+token);
            res.cookie('Authorization', token);
            res.redirect('/');
          }
          else{
            res.send('密碼錯誤！');
          }
      }
      else{
        res.send('此信箱尚未註冊！');
      }
    });
  });

});

app.post('/fb_signin', function(req, res) {
  let email = req.body.email;
  let name = req.body.name;
  let fb_token = req.body.access_token;
  let query_user_data = "SELECT * FROM user WHERE `email`='"+email+"';"
  let insert_user_data = "insert into user SET ?";
  // let insert = {
  //   email:email,
  //   provider:'Facebook',
  //   name:name,
  // };
  get_FB_photo(fb_token).then(function(result){
    let insert={
      email:email,
      provider:'Facebook',
      name:name,
      user_photo : result
    };
    mysql.pool.getConnection(function(error, connection) {
      if(error){
        console.log(error);
        res.send({error:"Error in connection database."});
      }
      connection.query(query_user_data, function(error, result, fields){
        if(error){
        console.log(error);
        console.log({error:"Add user_data Error"});
        connection.rollback(function() {
          throw error;
        });
        }if (result.length == 0) { 
        console.log("尚未註冊");
        console.log(insert);
        connection.query(insert_user_data, insert, function(error, result, fields){
          connection.release();
          if(error){
            console.log(error);
            console.log({error:"Add user_data Error"});
            connection.rollback(function() {
              throw error;
            });
          }
          else{
            
            let token = jwt.sign({
              algorithm: 'HS256',
              exp: Math.floor(Date.now() / 1000) + (60 * 60), // token一個小時後過期。
              data: email
              }, secret);
            res.setHeader('Authorization', 'Bearer '+token);
            res.cookie('Authorization', token);
            res.send('Sign up successed!');
          }
        });
        }
        else{
        
        let token = jwt.sign({
          algorithm: 'HS256',
          exp: Math.floor(Date.now() / 1000) + (60 * 60), // token一個小時後過期。
          data: email
          }, secret);
        res.setHeader('Authorization', 'Bearer '+token);
        res.cookie('Authorization', token);
        res.send('Login with Facebook successed!');
        console.log("註冊過了");
        }
      });
    });
  })

 });


app.post('/member', function(req, res) {

  const time = Math.floor(Date.now() / 1000);
  
  //判斷token是否正確
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
      } else{
        tokenResult = decoded.data;
        let like_image_data =[];
        
        let query = 'SELECT * from `image_data` AS A RIGHT JOIN `image_like` AS B ON A.`image_id` = B.`image_id` INNER JOIN `user` AS D on D.`email`= B.`email` WHERE D.`email` = "'+tokenResult+'";'
        //'SELECT * from image_data AS A INNER JOIN image_author AS C ON A.`image_id` = C.`image_id` RIGHT JOIN `image_like` AS B ON A.`image_id` = B.`image_id` where B.`email`="'+tokenResult+'";'
        
        mysql.pool.getConnection(function(error, connection) {
          if(error){
            console.log(error);
            res.send({error:"Error in connection database."});
          }    
          connection.query(query, function(error, result, fields){
            connection.release();
            if(error){
            console.log({error:"Add user_data Error"});
            connection.rollback(function() {
              throw error;
            });
            }
            else if(result.length == 0){ //沒有按下喜歡的圖片就丟 user 所有資訊
              //console.log(tokenResult);
              let user_query = 'SELECT * from `user` WHERE `email`="'+tokenResult+'"'
              connection.query(user_query, function(error, result, fields){
                
                if(error){
                  console.log({error:"Add user_data Error"});
                  connection.rollback(function() {
                    throw error;
                  });
                }
                else{
                  let user_name = result[0].name;
                  let email = result[0].email;
                  let user_profile_pic = result[0].user_photo;
                  res.send({status:200, user_name:user_name,user_email:email,user_pic:user_profile_pic||"null",like_image_info:"NULL"});
                  }
              });
            }
            else{
              for(let i=0;i<result.length;i++){
                like_image_data.push({
                  image_id:result[i].image_id,
                  image_url:result[i].image_url,
                  image_source_url:result[i].image_source_url,
                  image_like : result[i].likes,
                  auther_name:result[i].auther_name||'null',
                  auther_website:result[i].auther_website||'null',
                });
              }
              let user_name = result[0].name;
              let email = result[0].email;
              let user_profile_pic = result[0].user_photo;
              res.send({status:200, user_name:user_name,user_email:email,user_pic:user_profile_pic||"null",total_likes:result.length, like_image_info:like_image_data});
            }
          });
        });
      }
    });
});


app.post('/delete_broken_image', function(req, res) {
  let broken_image_id = JSON.parse(req.body.broken_id);
  broken_list(broken_image_id).then(function(result){
    //console.log(result[0]);
    let broken_id_list = result;
    let delete_image_data = 'DELETE FROM image_data WHERE (`image_id`) IN (?)';
    mysql.pool.getConnection(function(error, connection) {
      if(error){
        console.log(error);
        res.send({error:"Error in connection database."});
      }
      connection.query(delete_image_data, [broken_id_list] , function(error, query_result, fields){
        connection.release();
        if(error){
          console.log(error);
          res.send({error:"Delete image_data Error"});
        }
        else{
          res.send("123");
        }
      });
    });
  });
  
});






function broken_list(data){
  return new Promise((mainResolve, mainReject) => {
    let list = [];
    for(let i=0;i<data.length;i++){
      list.push(data[i].image_id);
    }
    return mainResolve(list);
  });
}






function get_FB_photo(token){
  return new Promise((mainResolve, mainReject) => {
    request('https://graph.facebook.com/me/picture?type=large&redirect=false&access_token='+token, 
    (error, response, body) => {
      let photo_info = JSON.parse(body);
      let FB_data = photo_info.data.url;
      return mainResolve(FB_data);
    });
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



function uploadToS3(data,filename,userId) {
  return new Promise((mainResolve, mainReject) => {
    AWS.config.loadFromPath('./config/S3config.json');
    let s3 = new AWS.S3({
      params: {
          Bucket: "jyhsum",
          Key: filename, //檔案名稱
          ACL: 'public-read' //檔案權限
      }
    });
    s3.upload({
        Body: data
    }).on('httpUploadProgress', function(evt) {   
        console.log(evt);//上傳進度
    }).
    send(function(err, data) {//上傳完畢或是碰到錯誤
      if(err){
        console.log(err);
      }
      else{
        console.log("Upload to S3 successed!");
        let pic_url = data.Location;
        let update_user_pic = 'UPDATE user SET `user_photo` ="'+pic_url+'" WHERE `user_id`= "'+userId+'";';
        let update_data = [pic_url,userId];
        mysql.pool.getConnection(function(error, connection) {
          if(error){
            connection.release();
            console.log(error);
            res.send({error:"Error in connection database."});
          }
          connection.beginTransaction(function(error){
            if(error){
                connection.rollback();
                connection.release(); 
                console.log({error:"Error to begin transaction."});
            }
            connection.query(update_user_pic, function(error, result, fields){ 
              if(error){
                console.log(error);
                return mainReject ({error:"Query image_data Error"});
              }
              else{
                connection.commit(function(error){
                  if(error){
                    console.log({error:"Database Query Error"});
                    return mysql.con.rollback(function(){
                      throw error;
                    });
                  }
                  else{
                      connection.release();
                      console.log(update_data);
                      console.log("insert data successed");
                      console.log('changed ' + result.changedRows + ' rows');
                      return mainResolve ({status:"Upload to S3 successed"});
                  }
                });

              }
            });
          });
        });
      }          
    });
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


