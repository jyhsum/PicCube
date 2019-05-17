const express = require('express');
const app = express();
const mysql = require('./util/mysqlcon');
const Nightmare = require('nightmare');
const nightmare_pexel = Nightmare({ show: false, waitTimeout: 6000});
const vo = require('vo');
const crypto = require('crypto');

app.get('/craw/pexels/:type', function(req, res) {
    let type = req.params.type;
    console.log(type);
    pexels_background_search(type);

});

const server = app.listen(80, function() {
    const host = server.address().address;
    const port = server.address().port;
    console.log('http://%s:%s', host, port);
});


function pexels_background_search(type){
  let image_insert_data=[];
  var run = function * () {
    yield nightmare_pexel.goto('https://www.pexels.com/search/'+type);
    yield nightmare_pexel.viewport(1024, 768);
    var previousHeight, currentHeight=0;
    let count = 10;
    for(let i=0;i<count;i++) {
      // previousHeight = currentHeight;
      // var currentHeight = yield nightmare_pexel.evaluate(function() {
      //   return document.body.scrollHeight;
      // });
      yield nightmare_pexel.scrollTo(0,document.body.scrollHeight)
          .wait(2000);
    }
    var urls = yield nightmare_pexel.evaluate(function() {
      let image_url =[];
      let image_source_url =[];
      document.querySelectorAll('.photo-item__img').forEach((el,index)=>{
        image_url.push(el.src);
      });
      document.querySelectorAll('.js-photo-link.photo-item__link').forEach((el,index)=>{
        image_source_url.push(el.href);
      });
      return ({image_url:image_url,image_source_url:image_source_url});
    });
    yield nightmare_pexel.end();
    return urls;  };    
  vo(run)(function(err,data) {
    if(data.image_url.length>0){
      for(let i=0;i<data.image_url.length;i++){         
        let image_id = i+crypto.randomBytes(32).toString('hex').substr(0,8);
        let provider = "pexels"       
        let insert_image_data = [data.image_source_url[i],data.image_url[i],provider,type,image_id];
        image_insert_data.push(insert_image_data);
      }
      insert_data(image_insert_data);
    }    
  });
}


function insert_data(image_insert_data){
    if(image_insert_data.length>0){
        console.log("start to insert data");
        let sql_image_data = "insert into image_data(`image_source_url`,`image_url`,`provider`, `tag`,`image_id`)VALUES  ?";
        mysql.pool.getConnection(function(error, connection) {
            if(error){
                console.log(error);
                console.log({error:"Error in connection database."});
            }
            connection.beginTransaction(function(error){
                if(error){
                    connection.rollback();
                    connection.release(); 
                    console.log({error:"Error to begin transaction."});
                }
                connection.query(sql_image_data, [image_insert_data], function(error, image_results, fields){
                    if(error){
                        console.log(error);
                        console.log({error:"Add image_data Error"});
                        connection.release();
                    }
                    else{
                        connection.commit(function(error){
                        if(error){
                            connection.release(); 
                            console.log({error:"Database Query Error"});
                            return mysql.con.rollback(function(){
                                throw error;
                            });
                        }
                        else{
                            console.log("Insert data successed!");  
                            connection.release();
                        }
                        });
                    }
                });
            });
        });
    }
};

