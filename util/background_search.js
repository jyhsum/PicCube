//This app will run after first search
const request = require('request');
const crypto = require('crypto');
const superagent = require('superagent');
const charset = require('superagent-charset');
charset(superagent);
const cheerio = require('cheerio');
const schedule = require('node-schedule');
const dao={
  image:require("../dao/new_image"),
};



let unsplash_background_counter = (type,start_page,end_page) => {
  if(end_page>100){
    end_page = 100;
  }
  let i=start_page;
  let rule = new schedule.RecurrenceRule();
  let times = [];
  for(let p=1; p<60; p++){
    if(p%3==0){
      times.push(p);
    }
  }
  rule.second = times;
  let unsplash_schedule = schedule.scheduleJob(rule, function(){
    unsplash_background_search(type,i);      
    if(i==end_page){
      schedule_cancel(unsplash_schedule);
    }
    i+=1;
  });
};

let pixabay_background_counter = (type,start_page,end_page)=>{
  if(end_page>50){
    end_page = 50;
  }
  let i=start_page;
  let rule = new schedule.RecurrenceRule();
  let times = [];
  for(let p=1; p<60; p++){
    if(p%3==0){
      times.push(p);
    }
  }
  rule.second = times;
  let pixabay_schedule = schedule.scheduleJob(rule, function(){
    pixabay_background_search(type,i);      
    if(i==end_page){
      schedule_cancel(pixabay_schedule);
    }
    i+=1;
  });
};

let photoac_background_counter = (type,start_page,end_page)=>{
  if(end_page>50){
    end_page = 50;
  }
  let i=start_page;
  let rule = new schedule.RecurrenceRule();
  let times = [];
  for(let p=1; p<60; p++){
    if(p%3==0){
      times.push(p);
    }
  }
  rule.second = times;
  let photoac_schedule = schedule.scheduleJob(rule, function(){
    photoac_background_search(type,i);      
    if(i==end_page){
      schedule_cancel(photoac_schedule);
    }
    i+=1;
  });
};


let stocksnap_background_counter = (type)=>{
  let image_insert_data =[];
  let baseUrl = 'https://stocksnap.io/api/search-photos/'+type+'/relevance/desc/1';
  request(baseUrl, function (error, response, body) {
    if (!error && response.statusCode == 200) {  
      let data = JSON.parse(body);      
      let total_page = Math.ceil(data.results.count/40);
      let i=2;
      let rule = new schedule.RecurrenceRule();
      let times = [];
      for(let p=1; p<60; p++){
        if(p%3==0){
          times.push(p);
        }
      }
      rule.second = times;
      let stocksnap_schedule = schedule.scheduleJob(rule, function(){
        stocksnap_background_search(type,i);      
        if(i==total_page+1){
          schedule_cancel(stocksnap_schedule);
        }
        i+=1;
      });
      data.results.forEach(function(element) {
        let image_id = element.img_id;
        let image_url = 'https://cdn.stocksnap.io/img-thumbs/280h/'+element.img_id+'.jpg';
        let image_source_url = 'https://stocksnap.io/photo/'+element.img_id;
        let provider = "stocksnap";
        let tag = type; 
        let insert_image_data = [image_source_url,image_url,provider,tag,image_id];
        image_insert_data.push(insert_image_data);                   
      }); 
      dao.image.insert_image(image_insert_data);  
    }
    else{
      schedule_cancel(stocksnap_schedule);
    }                                 
  });
}


function photoac_background_search(type,page){
  let baseUrl = 'https://photo-ac.com/en/search-result?page='+page+'&keyword='+type+'&per_page=100&order_by=popular';
  let image_url = [];
  let image_source_url = [];
  let img_insert_data = [];
  superagent
  .get(baseUrl)
  .charset('utf-8')
  .end(function(err, sres) {           
    if (err) {
      console.log('ERR: ' + err);
      console.log({ code: 400, msg: err });
      return;
    }
    let $ = cheerio.load(sres.text);   
    $('figure.gallery-image-container a').each(function(idx, element) {          
      let $element = $(element);
      image_source_url.push({image_source_url:"https://photo-ac.com"+$element.attr('href')});
    });
    $('figure.gallery-image-container div.gallery-image noscript').each(function(idx, element) {          
      let $element = $(element);
      image_url.push({image_url:$element.html().substring(10,94)});
    });
    for(let i=0;i<image_url.length;i++){
      let image_id = i+crypto.randomBytes(32).toString('hex').substr(0,8);
      let provider = "photoac"
      let insert_image_data = [image_source_url[i].image_source_url,image_url[i].image_url,provider,type,image_id];
      img_insert_data.push(insert_image_data);
    }
    dao.image.insert_image(img_insert_data);
  });
};


function stocksnap_background_search(type,page){
//https://stocksnap.io/api/search-photos/apple/relevance/desc/1
  let image_insert_data =[];
  let baseUrl = 'https://stocksnap.io/api/search-photos/'+type+'/relevance/desc/'+page;
  request(baseUrl, function (error, response, body) {
    if (!error && response.statusCode == 200) {  
      let data = JSON.parse(body);      
      page = data.results.nextPage;
      if(page!=='false'){
        data.results.forEach(function(element) {
          let image_id = element.img_id;
          let image_url = 'https://cdn.stocksnap.io/img-thumbs/280h/'+element.img_id+'.jpg';
          let image_source_url = 'https://stocksnap.io/photo/'+element.img_id;
          let provider = "stocksnap";
          let tag = type; 
          let insert_image_data = [image_source_url,image_url,provider,tag,image_id];
          image_insert_data.push(insert_image_data);                   
        }); 
        dao.image.insert_image(image_insert_data);
      }
    };                                  
  });
};


//cancel specified job
function schedule_cancel(schedule_name){
  schedule_name.cancel();
}

function pixabay_background_search(type,page) {
  let search_keyword = type;
  let baseUrl = 'https://pixabay.com/zh/images/search/'+search_keyword+'/?min_width=1920&min_height=1080&orientation=horizontal&pagi='+page;
  superagent
      .get(baseUrl)
      .charset('utf-8')
      .end(function(err, sres) { 
        let image_url = [];
        let image_source_url = [];
        let image_data = [];
        if (err) {
          console.log('ERR: ' + err);
          console.log({ code: 400, msg: err });
          return;
        }
        else{
          let $ = cheerio.load(sres.text);
            
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
            let image_id = i+crypto.randomBytes(32).toString('hex').substr(0,8);
            let provider = "pixabay"       
            let insert_image_data = [image_source_url[i].image_source_url,image_url[i].image_url,provider,type,image_id];
            image_data.push(insert_image_data);
          }
          dao.image.insert_image(image_data);
        }
      });
}

function unsplash_background_search(type,page) {
  let image_insert_data = [];
  baseUrl = 'https://unsplash.com/napi/search/photos?query='+type+'&xp=&per_page=20&page='+page;
  request(baseUrl, function (error, response, body) {
    if (!error && response.statusCode == 200) {  
      let data = JSON.parse(body);      
      data.results.forEach(function(element) {
        let image_id = element.id;
        let small_size = element.urls.small;
        let image_source_url = element.links.html;
        let provider = "unsplash";
        let tag = type; 
        let insert_image_data = [image_source_url,small_size,provider,tag,image_id];
        image_insert_data.push(insert_image_data);                   
      }); 
      dao.image.insert_image(image_insert_data);
    };                                  
  });      
};

module.exports={
  unsplash_background_counter,
  pixabay_background_counter,
  photoac_background_counter,
  stocksnap_background_counter
};
