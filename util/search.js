//This app will run when user enter a new keyword
const request = require('request');
const crypto = require('crypto');
const mysql = require('./mysqlcon.js');
const nightmareHelper = require("nightmare-helper");
const superagent = require('superagent');
const charset = require('superagent-charset');
charset(superagent);
const cheerio = require('cheerio');



let unsplash = (type) => {
  let baseUrl = 'https://unsplash.com/napi/search/photos?query='+type+'&xp=&per_page=20&page=0'
  return new Promise((mainResolve, mainReject) => {
    request(baseUrl, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        let data_1 = JSON.parse(body);
        let total_pages = data_1.total_pages;
        console.log(Math.floor(total_pages/10));
        for(let i=1;i<Math.floor(total_pages/5);i++){
          let image_data = [];
          let author_data = [];
          let img_display_data = [];
          baseUrl = 'https://unsplash.com/napi/search/photos?query='+type+'&xp=&per_page=20&page='+i+''
          request(baseUrl, function (error, response, body) {
            let data = JSON.parse(body);
            let total_amount = data.results.length;
            if (!error && response.statusCode == 200) {             
              for(let j=0;j<total_amount;j++){
                let image_id = crypto.randomBytes(32).toString('hex').substr(0,8);
                let display_data ={
                  image_id :image_id,
                  image_url:data.results[j].urls.small,
                  image_source_url:data.results[j].links.html,
                  tag:type,
                  provider:"unsplash",                            
                  author_name : data.results[j].user.name,
                  author_website : data.results[j].user.links.html
                };

                let small_size = data.results[j].urls.small;
                let author_name = data.results[j].user.name;
                let author_website = data.results[j].user.links.html;
                let image_source_url = data.results[j].links.html;
                let provider = "unsplash";
                let tag = type;
                
                let insert_image_data = [image_source_url,small_size,provider,tag,image_id];
                let insert_author_data = [author_name,author_website,image_id];
                image_data.push(insert_image_data);
                author_data.push(insert_author_data);
                img_display_data.push(display_data);
              }
            
              let sql_image_data = "insert into image_data(`image_source_url`,`image_url`,`provider`, `tag`,`image_id`)VALUES  ?";
              let sql_auther_data = "insert into image_author(`author_name`,`author_website`,`image_id`)VALUES  ?";


              mysql.con.beginTransaction(function(error){
                if(error){
                  throw error;
                }
                mysql.con.query(sql_image_data, [image_data], function(error, image_results, fields){
                  if(error){
                    console.log(error);
                    console.log({error:"Add image_data Error"});
                    mysql.con.rollback(function() {
                      throw error;
                    });
                  }
                  else{
                    mysql.con.query(sql_auther_data, [author_data], function(error, results, fields){
                      if(error){
                        console.log(error);
                        console.log({error:"Add author_data Error"});
                        mysql.con.rollback(function() {
                          throw error;
                        });
                      }
                      else {
                        mysql.con.commit(function(error){
                          if(error){
                            console.log({error:"Database Query Error"});
                            return mysql.con.rollback(function(){
                              throw error;
                            });
                          }
                          else{
                            return mainResolve({status:"OK",provider:unsplash,data:img_display_data});
                          }
                        });
                      }
                    });
                  }
                });
              });
           }
         });
        }
      }
    });

  });

};


let google = (type) => {
  let search_keyword = type;
  let baseUrl = 'https://www.google.com/search?q="'+search_keyword+'"+wallpaper'
  //搜尋條件控制
  options = {
    filters:"&tbs=isz:lt,islt:xga&tbm=isch",
    location:"com",
    show:false,
    horizontalFlag:true
  };
  return new Promise((mainResolve, mainReject) => {

    nightmareHelper.googleImagesLong('"'+search_keyword+'"+wallpaper',options)
    .then((result)=>{
      let img_data = [];
      let author_data = [];
      let img_display_data = [];
      
      for(let i = 0; i<result.length ;i++){
        let image_id = crypto.randomBytes(32).toString('hex').substr(0,10);
        let data ={
          image_url :result[i].imageSrc,
          image_source_url :result[i].image_Source_URL,
          provider :"google_search",
          tag :search_keyword,
          image_id :image_id,
          author_name : "null",
          author_website : "null"
        };

        let image_source_url = result[i].image_Source_URL;
        let regular_size = result[i].imageSrc;
        let provider = "google_search";
        let tag = search_keyword;
        
        let insert_image_data = [image_source_url,regular_size,provider,tag,image_id];
        let insert_author_data = [image_id];
        img_data.push(insert_image_data);
        author_data.push(insert_author_data);
        img_display_data.push(data);
      }
      let sql_image_data = "insert into image_data(`image_source_url`,`image_url`,`provider`, `tag`, `image_id`)VALUES  ?";
      let sql_author_data = "insert into image_author(`image_id`)VALUES  ?";
      mysql.con.beginTransaction(function(error){
        if(error){
          throw error;
        }
        mysql.con.query(sql_image_data, [img_data], function(error, image_results, fields){
          if(error){
            console.log(error);
            console.log({error:"Add image_data Error"});
            mysql.con.rollback(function() {
              throw error;
            });
          }
          else{
            mysql.con.query(sql_author_data, [author_data], function(error, author_results, fields){
              if(error){
                console.log(error);
                console.log({error:"Add author_data Error"});
                mysql.con.rollback(function() {
                  throw error;
                });
              }
              else{
                mysql.con.commit(function(error){
                  if(error){
                    console.log({error:"Database Query Error"});
                    return mysql.con.rollback(function(){
                      throw error;
                    });
                  }
                  else{
                    return mainResolve({status:"OK",provider:google,data:img_display_data});
                  }
                });
              }
            });
          }
        });
      });
    }).catch(console.log);
  });
};


let kaboompics = (type) => {
  
  let output_data = [];
  return new Promise((mainResolve, mainReject) => {
    let baseUrl = 'https://kaboompics.com/gallery?search='+type;

    superagent
      .get(baseUrl)
      .charset('utf-8')
      .end(function(err, sres) {           
          let image_url = [];
          let image_source_url = [];
          let img_data=[];
          let author_data=[];
          if (err) {
              console.log('ERR: ' + err);
              res.json({ code: 400, msg: err, sets: items });
              return;
          }
          let $ = cheerio.load(sres.text);
          //先抓取最後一頁的頁碼
          let last_page_div = $('div#top.page div.pagination span.last a').attr('href');
          if(last_page_div){
            let last_page = last_page_div.split("=")[2];
            let url_array = [];
            let count = 0;
            for(let j =1;j<=last_page;j++){
              
              let url = 'https://kaboompics.com/gallery?search='+type+'&page='+j;
              get_url_data(url)
              .then((result)=>{
                count +=1;
                  for(let i=0;i<image_url.length;i++){
                    let image_id = crypto.randomBytes(32).toString('hex').substr(0,8);
                    let provider = "kaboompics"
                    output_data.push({
                      image_id:image_id,
                      image_url:image_url[i].image_url,
                      image_source_url:image_source_url[i].image_source_url,
                      tag: type,
                      provider: provider,
                      author_name : "null",
                      author_website : "null"
                    });
                    let insert_image_data = [image_source_url[i].image_source_url,image_url[i].image_url,provider,type,image_id];
                    let insert_author_data = [image_id];
                    img_data.push(insert_image_data);
                    author_data.push(insert_author_data);

                }
                if(count == last_page){
                  let sql_image_data = "insert into image_data(`image_source_url`,`image_url`,`provider`, `tag`, `image_id`)VALUES  ?";
                  let sql_author_data = "insert into image_author(`image_id`)VALUES  ?";
                  mysql.con.beginTransaction(function(error){
                    if(error){
                      throw error;
                    }
                    mysql.con.query(sql_image_data, [img_data], function(error, image_results, fields){
                      if(error){
                        console.log(error);
                        console.log({error:"Add image_data Error"});
                        mysql.con.rollback(function() {
                          throw error;
                        });
                      }
                      else{
                        mysql.con.query(sql_author_data, [author_data], function(error, author_results, fields){
                          if(error){
                            console.log(error);
                            console.log({error:"Add author_data Error"});
                            mysql.con.rollback(function() {
                              throw error;
                            });
                          }
                          else{
                            mysql.con.commit(function(error){
                              if(error){
                                console.log({error:"Database Query Error"});
                                return mysql.con.rollback(function(){
                                  throw error;
                                });
                              }
                              else{
                                return mainResolve({status:"OK",provider:"kaboompics",data:output_data});
                              }
                            });
                          }
                        });
                      }
                    });
                  });         
                }           
              });

            }

          function get_url_data(url){
            return new Promise((mainResolve, mainReject) => {
              superagent
              .get(url)
              .charset('utf-8')
              .end(function(err, sres) { 

                $('div.work-img img').each(function(idx, element) {          
                  let $element = $(element);
                  image_url.push({image_url:"https://kaboompics.com"+$element.attr('data-original')});
                });
                
                $('a.btn.btn-mod.btn-border.btn-small.btn-round.quick-download.after-download-box').each(function(idx, element) {         
                  let $element = $(element); 
                  image_source_url.push({image_source_url:$element.attr('data-popup-href')});
                }); 
                return mainResolve({status:"OK"});
              });
            });
           }

          }
          
          //搜尋結果只有一頁
          else {
            superagent
            .get(baseUrl)
            .charset('utf-8')
            .end(function(err, sres) {           
              let image_url = [];
              let image_source_url = [];
              let img_data=[];
              let author_data=[];
              if (err) {
                  console.log('ERR: ' + err);
                  res.json({ code: 400, msg: err, sets: items });
                  return;
              }
              let $ = cheerio.load(sres.text);


              console.log("last page is not exist");
              $('div.work-img img').each(function(idx, element) {          
                let $element = $(element);
                image_url.push({image_url:"https://kaboompics.com"+$element.attr('data-original')});
              });
              $('a.btn.btn-mod.btn-border.btn-small.btn-round.quick-download.after-download-box').each(function(idx, element) {         
                let $element = $(element); 
                image_source_url.push({image_source_url:$element.attr('data-popup-href')});
              });

              for(let i=0;i<image_url.length;i++){
                let image_id = crypto.randomBytes(32).toString('hex').substr(0,8);
                let provider = "kaboompics"
                output_data.push({
                  image_id:image_id,
                  image_url:image_url[i].image_url,
                  image_source_url:image_source_url[i].image_source_url,
                  tag: type,
                  provider: provider,
                  author_name : "null",
                  author_website : "null"
                });
                let insert_image_data = [image_source_url[i].image_source_url,image_url[i].image_url,provider,type,image_id];
                let insert_author_data = [image_id];
                img_data.push(insert_image_data);
                author_data.push(insert_author_data);
                }
                console.log(img_data.length);
            
                let sql_image_data = "insert into image_data(`image_source_url`,`image_url`,`provider`, `tag`, `image_id`)VALUES  ?";
                let sql_author_data = "insert into image_author(`image_id`)VALUES  ?";
                mysql.con.beginTransaction(function(error){
                  if(error){
                    throw error;
                  }
                  mysql.con.query(sql_image_data, [img_data], function(error, image_results, fields){
                    if(error){
                      console.log(error);
                      console.log({error:"Add image_data Error"});
                      mysql.con.rollback(function() {
                        throw error;
                      });
                    }
                    else{
                      mysql.con.query(sql_author_data, [author_data], function(error, author_results, fields){
                        if(error){
                          console.log(error);
                          console.log({error:"Add author_data Error"});
                          mysql.con.rollback(function() {
                            throw error;
                          });
                        }
                        else{
                          mysql.con.commit(function(error){
                            if(error){
                              console.log({error:"Database Query Error"});
                              return mysql.con.rollback(function(){
                                throw error;
                              });
                            }
                            else{
                              return mainResolve({status:"OK",provider:kaboompics,data:output_data}); 
                            }
                          });
                        }
                      });
                    }
                  });
                }); 
            
          });
          }
     
       });
      
    });
};



module.exports.unsplash = unsplash;
module.exports.google = google;
module.exports.kaboompics = kaboompics;
