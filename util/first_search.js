//This app will run when user enter a new keyword
const request = require('request');
const crypto = require('crypto');
const mysql = require('./mysqlcon.js');
const nightmareHelper = require("nightmare-helper");
const superagent = require('superagent');
const charset = require('superagent-charset');
charset(superagent);
const cheerio = require('cheerio');
const {Translate} = require('@google-cloud/translate');
const projectId = 'jyhsum';
const translate = new Translate({
  projectId: projectId,
});
const background_search = require("../util/background_search.js");



//If search word is Chinese translate it to English before search.
let is_chinese = (type)=>{
    return new Promise((mainResolve, mainReject) => {
        if (escape(type).indexOf("%u") !=-1){ 
            translate_keyword(type).then(function(translate_result){
                search_keyword = translate_result;
                first_search(search_keyword).then(function(first_search_result){
                    return mainResolve({data:first_search_result.data});
                });
            });
        }
        else{
            search_keyword = type;
            first_search(search_keyword).then(function(first_search_result){
                return mainResolve({data:first_search_result.data});
            });
        }
    });
}

function first_search(type){
  return new Promise((mainResolve, mainReject) => {
    let search_keyword = type;
      pixabay(search_keyword).then(function(pixabay_result){
        if(pixabay_result.status==404){
          pixabay_result.data=[];
          pixabay_result.image_insert_data=[];
        }
          unsplash(search_keyword).then(function(unsplash_result){
            if(unsplash_result.status==404){
              unsplash_result.data=[];
              unsplash_result.image_insert_data=[];
            }             
            let first_result = unsplash_result.data.concat(pixabay_result.data);
            if(first_result.length==0){ //前三個網站都找不到資料的情況再用google search
              google(search_keyword).then(function(google_result){
                if(google_result.status==404){   
                  return mainResolve({data:[]});
                }
                insert_tag_name(type);
                insert_data(google_result.image_insert_data);
                return mainResolve({data:google_result.data});
              });
            }
            else{
              insert_tag_name(type);
              background_search.pexels_background_search(type);
              background_search.kaboompics_background_counter(type);
              insert_data(unsplash_result.image_insert_data.concat(pixabay_result.image_insert_data));
              return mainResolve({data:unsplash_result.data.concat(pixabay_result.data)});
            }
          });               
      });
  });
}

function insert_tag_name(tagName){
  let insert_tag_data = "insert into tag(`tag_name`)VALUES (?)";
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
      connection.query(insert_tag_data, tagName ,function(error, results, fields){
        if(error){
          console.log(error);
          console.log({error:"Add tag_data Error"});
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
                  console.log("Insert tag_data successed!");  
                  connection.release();
              }
            });
        }
      });
    });
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
}

function translate_keyword(keyword){
    return new Promise((mainResolve, mainReject) => {
      const text = keyword;
      const target = 'en';
      translate
        .translate(text, target)
        .then(results => {
          const translation = results[0];
          console.log("翻譯過:"+translation);
          return mainResolve (translation);
        })
        .catch(err => {
          console.error('ERROR:', err);
        });
    });
}

let pixabay = (type)=>{
    return new Promise((mainResolve, mainReject) => {
        let output_data = [];
        console.log("pixabay search");
        let baseUrl = 'https://pixabay.com/zh/images/search/'+search_keyword+'/?min_width=1920&min_height=1080&orientation=horizontal';
        superagent
        .get(baseUrl)
        .charset('utf-8')
        .end(function(err, sres) {           
            if (err) {
                console.log('ERR: ' + err);
                return mainResolve({ status: 400, msg: err});
            }
            let $ = cheerio.load(sres.text);
            //找不到圖片的情況
            if(!$('div.flex_grid.credits.search_results div.item a').attr('href')){
                console.log("pixabay找不到圖片");
                return mainResolve({status:404,provider:pixabay,data:""});
            }
            else{
                console.log("pixabay開始找圖片");
                let image_url = [];
                let image_source_url = [];
                let image_data=[];
                let total_page = $('form.add_search_params.pure-form.hide-xs.hide-sm.hide-md').text().trim().replace("/ ","");
                if(total_page>1){
                  background_search.pixabay_background_counter(search_keyword,2,total_page);
                }


                $('div.flex_grid.credits.search_results div.item a').each(function(idx, element) {          
                    let $element = $(element);
                    if($element.attr('href').search('search')==-1){
                        image_source_url.push({image_source_url:'https://pixabay.com'+$element.attr('href')});
                    }
                });
                
                $('div.flex_grid.credits.search_results div.item a img').each(function(idx, element) {     
                    let $element = $(element);
                    if($element.attr('src').search('blank.gif')==-1){
                        image_url.push({image_url:$element.attr('src')});
                        
                    }
                });
                
                for(let i=0;i<image_url.length;i++){
                    let image_id = crypto.randomBytes(32).toString('hex').substr(0,8);
                    let provider = "pixabay"
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
                    image_data.push(insert_image_data);
                }
                return mainResolve({
                    status:200,
                    provider:"pixabay",
                    data:output_data,
                    image_insert_data:image_data
                });

        }
        });
    });
}

let unsplash = (type) =>{
  let baseUrl = 'https://unsplash.com/napi/search/photos?query='+type+'&xp=&per_page=20&page=1'
  return new Promise((mainResolve, mainReject) => {
    request(baseUrl, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        let data = JSON.parse(body);
        let total_data = data.total;
        let total_pages = data.total_pages;
        let end_page=total_pages;
        if(total_data !="0" && total_pages>1){ //if more than 2 pages
          let image_insert_data = [];
          let img_display_data = [];
          if(total_pages>20){end_page=20;}
          background_search.unsplash_background_counter(search_keyword,2,end_page);
          data.results.forEach(function(element) {
            let image_id = element.id;
            let small_size = element.urls.small;
            let image_source_url = element.links.html;
            let provider = "unsplash";
            let tag = type; 
            let insert_image_data = [image_source_url,small_size,provider,tag,image_id];
            image_insert_data.push(insert_image_data);
            let display_data ={
              image_id :image_id,
              image_url:small_size,
              image_source_url:image_source_url,
              tag:type,
              provider:"unsplash"
            };
            img_display_data.push(display_data);
            return mainResolve({
              status:200,
              provider:"unsplash",
              data:img_display_data,
              image_insert_data:image_insert_data
            });
          });  
        }
        else{
          console.log("unsplash沒有找到圖片");
          return mainResolve({status:404,provider:"unsplash",data:""});
        }
      }
    });  
  });
};

let google = (type)=>{
  return new Promise((mainResolve, mainReject) => {
    let img_data = [];
    let img_display_data = [];
    //搜尋條件控制
    options = {
      filters:"&tbs=isz:lt,islt:xga&tbm=isch",
      location:"com",
      show:true,
      horizontalFlag:true
    };
    nightmareHelper.googleImagesLong('"'+type+'"+wallpaper',options).then((result)=>{
      if(result.length>0){
        for(let i = 0; i<result.length ;i++){
          let image_id = crypto.randomBytes(32).toString('hex').substr(0,8);
          let data ={
            image_id : image_id,
            image_url :result[i].imageSrc,
            image_source_url :result[i].image_Source_URL,
            provider :"google_search",
            tag :search_keyword,
          };
          let image_source_url = result[i].image_Source_URL;
          let regular_size = result[i].imageSrc;
          let provider = "google_search";
          let tag = search_keyword;
          let insert_image_data = [image_source_url,regular_size,provider,tag,image_id];
          img_data.push(insert_image_data);
          img_display_data.push(data);
        }
        return mainResolve({
          status:200,
          provider:"google_search",
          data:img_display_data,
          image_insert_data:img_data
        });
      }
      else{
        return mainResolve({status:404,provider:"google_search",data:""});
      }
    });
  });
}




module.exports.is_chinese = is_chinese;
  