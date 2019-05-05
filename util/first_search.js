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



//如果是中文就先翻譯然後用翻譯過的結果去查
let isChinese = (type) =>{
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
          pexels(search_keyword).then(function(pexels_result){
            if(pexels_result.status==404){
              pexels_result.data=[];
              pexels_result.image_insert_data=[];
            }  
            unsplash(search_keyword).then(function(unsplash_result){
              if(unsplash_result.status==404){
                unsplash_result.data=[];
                unsplash_result.image_insert_data=[];
              }             
              let first_result = pixabay_result.data.concat(unsplash_result.data).concat(pexels_result.data);
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
                background_search.kaboompics_background_counter(type);
                insert_data(unsplash_result.image_insert_data.concat(pixabay_result.image_insert_data).concat(pexels_result.image_insert_data));  
                return mainResolve({data:pixabay_result.data.concat(unsplash_result.data).concat(pexels_result.data)});
              }
              });   
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


let pixabay = (type)=> {
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



let unsplash = (type) => {
  console.log("unsplash 第一次搜尋");
  let baseUrl = 'https://unsplash.com/napi/search/photos?query='+type+'&xp=&per_page=20&page=0'
  return new Promise((mainResolve, mainReject) => {
    request(baseUrl, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        let data_1 = JSON.parse(body);
        let total_data = data_1.total;
        let total_pages = data_1.total_pages;
        let x=0;
        if(total_data !="0"){ //搜尋的到資料的話
          let image_insert_data = [];
          let author_insert_data = [];
          let img_display_data = [];
          if(total_pages<=5){ x=total_pages;}  //5頁以內的話就全抓
          if(total_pages>5){ x=5;} //5頁以上的話第一次先抓5頁就好
          console.log("unsplash 有資料");
          console.log("unsplash總共有幾頁:", data_1.total_pages);
          console.log("第一次先抓幾頁:", x);
          //呼叫背景執行的 function
          background_search.unsplash_background_counter(search_keyword,x+1,total_pages);
          let count = 0;
          for(let i=1;i<=x;i++){
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
                  image_insert_data.push(insert_image_data);
                  author_insert_data.push(insert_author_data);
                  img_display_data.push(display_data);
                  count+=1;   
                  if(count==x){
                    return mainResolve({
                      status:200,
                      provider:"unsplash",
                      data:img_display_data,
                      image_insert_data:image_insert_data,
                      author_insert_data:author_insert_data
                    });
                              
                  }
                }
                    
              }
            });              
          }
        }
          else{
            console.log("unsplash沒有找到圖片");
            return mainResolve({status:404,provider:"unsplash",data:""});
          }
        }
    });  
  });
};


let pexels = (type)=> {
    return new Promise((mainResolve, mainReject) => {
      let search_keyword = type;
      let baseUrl = 'https://www.pexels.com/search/'+search_keyword;
      superagent
      .get(baseUrl)
      .charset('utf-8')
      .end(function(err, sres) {           
        let image_url = [];
        let image_source_url = [];
        let image_data=[];
        let output_data =[];
        if (err) {
            console.log('ERR: ' + err);
            return mainResolve({ status: 400, msg: err});
            
        }
        let $ = cheerio.load(sres.text);
  
        //找不到資料的情況
        if(!$('img.photo-item__img').attr('src')){
          console.log("pexels找不到圖片");
          
          return mainResolve({status:404,provider:"pexels",data:""});
        }
        else{
          console.log("pexels開始找圖片");

          $('a.js-photo-link.photo-item__link').each(function(idx, element) {          
            let $element = $(element);
            image_source_url.push({image_source_url:'https://www.pexels.com'+$element.attr('href')});
          });
  
          $('img.photo-item__img').each(function(idx, element) {          
            let $element = $(element);
            image_url.push({image_url:$element.attr('src')});
            //image_source_url.push({image_source_url:$element.attr('href')}); //'https://www.pexels.com'
          });

          let total_images = $('a.rd__tabs__tab').text().match(/\d+/)[0]; //.match(/\d+/)[0]
          if(total_images>30){ //因為第一次爬只會抓到30個 如果總個數大於30個以上就背景把剩下的圖片爬完
            background_search.pexels_background_search(type,image_source_url.length);
          }
          
          for(let i=0;i<image_source_url.length;i++){
            let image_id = crypto.randomBytes(32).toString('hex').substr(0,8);
            let provider = "pexels"
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
                provider:"pexels",
                data:output_data,
                image_insert_data:image_data
            });
        }
    });
    });
}



let google = (type)=> {
  return new Promise((mainResolve, mainReject) => {
    //搜尋條件控制
    options = {
      filters:"&tbs=isz:lt,islt:xga&tbm=isch",
      location:"com",
      show:true,
      horizontalFlag:true
    };
    nightmareHelper.googleImagesLong('"'+type+'"+wallpaper',options)
    .then((result)=>{
      console.log(result.length);
      if(result.length>0){
          let img_data = [];
          let img_display_data = [];
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




module.exports.isChinese = isChinese;
  