const express = require('express');
const app = express.Router();
const superagent = require('superagent');
const charset = require('superagent-charset');
charset(superagent);
const cheerio = require('cheerio');
const request = require('request');
const Nightmare = require('nightmare');
const nightmare = Nightmare({ show: true, waitTimeout: 6000 });




app.get('/pixabay', function(req, res) {
    let search_keyword = "juice";
    let baseUrl = 'https://pixabay.com/zh/images/search/'+search_keyword+'/?min_width=1920&min_height=1080&orientation=horizontal';
    superagent
    .get(baseUrl)
    .charset('utf-8')
    .end(function(err, sres) { 
   
      let image_url = [];
      let image_source_url = [];
      let image_data = [];
      if (err) {
          console.log('ERR: ' + err);
          res.json({ code: 400, msg: err, sets: items });
          return;
      }
      let $ = cheerio.load(sres.text);
      let total_pages = $('form.add_search_params.pure-form.hide-xs.hide-sm.hide-md').text().trim().replace("/ ","");
      $('div.flex_grid.credits.search_results div.item a').each(function(idx, element) {               
        let $element = $(element);
        if($element.attr('href').search('search')==-1){      
          image_source_url.push({image_url:'https://pixabay.com'+$element.attr('href')});
        }
      });
  
      $('div.flex_grid.credits.search_results img').each(function(idx, element) {          
        let $element = $(element);
        image_url.push({image_source_url:$element.attr('src')});
      });
                 // for(let i=0;i<image_url.length;i++){
                    //console.log(image_url[i]);
                  //  console.log(image_source_url[i]);
                  // let image_id = crypto.randomBytes(32).toString('hex').substr(0,8);
                  // let provider = "pixabay"
                  // let image_source_url = image_source_url[i].image_source_url;
                  // let image_url = image_url[i].image_url;           
                  // let insert_image_data = [image_source_url,image_url,provider,type,image_id];
                  //image_data.push(insert_image_data);
              //}
  
    });
   
  });
  
  
  
  
  app.get('/pexels', function(req, res) {
    return new Promise((mainResolve, mainReject) => {
      let search_keyword = 'frog';
      let baseUrl = 'https://www.pexels.com/search/'+search_keyword;
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
        let total_images = $('a.rd__tabs__tab').text().match(/\d+/)[0];
        console.log("total_images "+total_images);
        //找不到資料的情況
        // if($('div.hide-featured-badge  hide-favorite-badge')){
        //   console.log("找不到圖片");
        //   return mainResolve({status:404,provider:"pexels",data:""});
        // }
        // else{
        //   console.log("有圖片");
        //   $('a.js-photo-link.photo-item__link').each(function(idx, element) {          
        //     let $element = $(element);
        //     console.log($element.attr('href'));
        //     image_source_url.push({image_url:'https://www.pexels.com/search'+$element.attr('href')});
        //   });
  
        //   $('img.photo-item__img').each(function(idx, element) {          
        //     let $element = $(element);
        //     console.log($element.attr('src'));
        //     image_url.push({image_url:$element.attr('src')});
        //   });
        // }
      });
    });
  });
  
  
  
  
  
  
  app.get('/test', function(req, res) {
    let keyword = 'pokem'; //9
    //總長度大於三才切割字串
    // if(keyword.length>3){
    //   let keyword_left = cut_param_odd(keyword)[0];
    //   let keyword_right = cut_param_odd(keyword)[1];
    //   console.log(keyword_left);
    //   console.log(keyword_right);
    // }
    
    //偶數的狀況
  });
  
  
  //奇數狀況
  function cut_param_odd(word){
    if (word.length<=3) {
      return cut_param_odd(key_left);
    }
    let total = word.length;
    let mid = Math.floor(total/2); //4
    let key = word.split("");  //[ 'p', 'o', 'k', 'e', 'm', 'o', 'n', 'a', 'a' ]
    let key_left = key.slice(0, mid+1); //[ 'p', 'o', 'k', 'e', 'm' ]
    let key_right = key.slice(mid, total); //[ 'm', 'o', 'n', 'a', 'a' ]
      // console.log(key);
      // console.log(key_left);
      // console.log(key_right);
    return [key_left,key_right];
    
  }

















module.exports = app ;