const express = require('express');
const app = express.Router();
const multer = require('multer');
const AWS = require('aws-sdk');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const mysql = require("../util/mysqlcon.js");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config/development_config');
const secret = config.config.secret;
const request = require('request');


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
    ;
    if(check_mail(email)){
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
                }
              });
            }
          });
        });
    }
    else{
      res.send("Valid email address.");
    }
  
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
    if(!email){
      res.send('Please provide your email on Facebook or use email to signup!');
    }
    else{
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
    }
});
  
app.post('/', function(req, res) {
  
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
                console.log(tokenResult);
                let user_query = 'SELECT * from `user` WHERE `email`="'+tokenResult+'"'
                connection.query(user_query, function(error, result, fields){
                  
                  if(error){
                    console.log({error:"Select user_data Error"});
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
                    upload_to_S3(req.file.buffer,file_name,userId).then (function(result){
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
  




function check_mail(mail){
  //Regular expression Testing
  let emailRule = /^\w+((-\w+)|(\.\w+))*\@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z]+$/;
  
  //validate ok or not
  if(mail.search(emailRule)!= -1){
    return true;
  }
  else{
    return false;
  } 
};



function get_FB_photo(token){
    return new Promise((mainResolve, mainReject) => {
        request('https://graph.facebook.com/me/picture?type=large&redirect=false&access_token='+token, (error, response, body) => {
            let photo_info = JSON.parse(body);
            let FB_data = photo_info.data.url;
            return mainResolve(FB_data);
        });
    });
}


function upload_to_S3(data,filename,userId) {
    return new Promise((mainResolve, mainReject) => {
      AWS.config.loadFromPath('./config/S3config.json');
      let s3 = new AWS.S3({
        params: {
            Bucket: "jyhsum",
            Key: filename,
            ACL: 'public-read'
        }
      });
      s3.upload({
          Body: data
      }).on('httpUploadProgress', function(evt) {
          //evt is the upload process
      }).
      send(function(err, data) {
        if(err){
          console.log(err);
          return mainReject ({error:"Upload to S3 Error"});
        }
        else{
          let pic_url = data.Location;
          let update_user_pic = 'UPDATE user SET `user_photo` ="'+pic_url+'" WHERE `user_id`= "'+userId+'";';
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



module.exports = app ;