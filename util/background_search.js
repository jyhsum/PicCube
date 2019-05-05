//This app will run after first search
const request = require('request');
const crypto = require('crypto');
const mysql = require('./mysqlcon.js');
const nightmareHelper = require("nightmare-helper");
const superagent = require('superagent');
const charset = require('superagent-charset');
charset(superagent);
const cheerio = require('cheerio');
const schedule = require('node-schedule');
const Nightmare = require('nightmare');
const nightmare = Nightmare({ show: true, waitTimeout: 6000 });
const vo = require('vo');



//定時任務範例
function scheduleCronstyle(){
    console.log("schedule1");
    schedule.scheduleJob('1-10 * * * * *', function(){
      console.log("schedule2");
        console.log('scheduleCronstyle:' + new Date());
    }); 
};




let unsplash_background_counter = (type,start_page,end_page)=>{
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
        console.log('unsplash背景搜尋第幾次:' +i, new Date());  //設定每分鐘的 1-30秒執行
        unsplash_background_search(type,i);      
        if(i==end_page){
            console.log("最後一頁,unsplash_schedule stop");
            schedule_cancel(unsplash_schedule);
        }
        i+=1;
    });
};


let pixabay_background_counter = (type,start_page,end_page)=>{
    if(end_page>150){
        end_page = 150;
    }
    let i=start_page;
    let rule = new schedule.RecurrenceRule();
    let times = [];
    for(let p=1; p<60; p++){
        if(p%2==0){
            times.push(p);
        }
    }
    rule.second = times;
    let pixabay_schedule = schedule.scheduleJob(rule, function(){
        console.log("end_page: "+end_page);
        console.log('pixabay背景搜尋第幾次:' +i, new Date());
        pixabay_background_search(type,i);      
        if(i==end_page){
            console.log("最後一頁,pixabay_schedule stop");
            schedule_cancel(pixabay_schedule);
        }
        i+=1;
    });
};


let kaboompics_background_counter = (type) => {
    console.log("kaboompics_background_counter");
    let baseUrl = 'https://kaboompics.com/gallery?search='+type;
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
        //先抓取最後一頁的頁碼
        let last_page_div = $('div#top.page div.pagination span.last a').attr('href');
        if(last_page_div){
            let end_page = last_page_div.split("=")[2];
            let i=1;
            let kaboompics_schedule = schedule.scheduleJob('50-59 * * * * *', function(){
                console.log('kaboompics背景搜尋第幾次:' +i, new Date());
                kaboompics_background_search(type,i);      
                if(i==end_page){
                    console.log("最後一頁,kaboompics_schedule stop");
                    schedule_cancel(kaboompics_schedule);
                }
                i+=1;
            });       
        }
        else{ //只有一頁或是找不到資料
            let image_url = [];
            let image_source_url = [];
            let img_insert_data = [];
            if(!$('div.work-img img').attr('data-original')){
                console.log("kaboompics找不到圖片");
                return ({status:200,provider:"kaboompics",data:""}); 
            }
            else{ //把第一頁的data新增到資料庫
                console.log("kaboompics只有一頁")
                $('div.work-img a img.lazy').each(function(idx, element) {          
                    let $element = $(element);
                    image_url.push({image_url:"https://kaboompics.com"+$element.attr('data-original')});
                });
                $('div.work-img a').each(function(idx, element) {         
                    let $element = $(element); 
                    image_source_url.push({image_source_url:$element.attr('href')});
                });
            
                for(let i=0;i<image_url.length;i++){
                    let image_id = crypto.randomBytes(32).toString('hex').substr(0,8);
                    let provider = "kaboompics"
                    let insert_image_data = [image_source_url[i].image_source_url,image_url[i].image_url,provider,type,image_id];
                    img_insert_data.push(insert_image_data);
                }
                insert_data(img_insert_data);                

            }
        }
    });
}

//page從第一頁開始
function kaboompics_background_search(type,page){
    let baseUrl = 'https://kaboompics.com/gallery?search='+type+'&page='+page;
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
        $('div.work-img a img.lazy').each(function(idx, element) {          
            let $element = $(element);
            image_url.push({image_url:"https://kaboompics.com"+$element.attr('data-original')});
        });
        $('div.work-img a').each(function(idx, element) {         
            let $element = $(element); 
            image_source_url.push({image_source_url:$element.attr('href')});
        });

        for(let i=0;i<image_url.length;i++){
            let image_id = crypto.randomBytes(32).toString('hex').substr(0,8);
            let provider = "kaboompics"
            let insert_image_data = [image_source_url[i].image_source_url,image_url[i].image_url,provider,type,image_id];
            img_insert_data.push(insert_image_data);
        }
       insert_data(img_insert_data);
    });

};

function pexels_background_search(type,start){
    let image_insert_data=[];
    var run = function * () {
        yield nightmare.goto('https://www.pexels.com/search/'+type);
        yield nightmare.viewport(1024, 768);
        var previousHeight, currentHeight=0;
        while(previousHeight !== currentHeight) {
        previousHeight = currentHeight;
        var currentHeight = yield nightmare.evaluate(function() {
            return document.body.scrollHeight;
        });
        yield nightmare.scrollTo(currentHeight, 0)
        .wait(1000);
        }
        var urls = yield nightmare.evaluate(function() {
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
        yield nightmare.end();
        return urls;
    };
    
    vo(run)(function(err,data) {
        if(data.image_source_url.length>30){
            for(let i=start;i<data.image_source_url.length;i++){         
                let image_id = crypto.randomBytes(32).toString('hex').substr(0,8);
                let provider = "pexels"       
                let insert_image_data = [data.image_source_url[i],data.image_url[i],provider,type,image_id];
                image_insert_data.push(insert_image_data);
            }
            insert_data(image_insert_data);
        }
        
    });
   
}

//取消任務
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
                let image_id = crypto.randomBytes(32).toString('hex').substr(0,8);
                let provider = "pixabay"       
                let insert_image_data = [image_source_url[i].image_source_url,image_url[i].image_url,provider,type,image_id];
                image_data.push(insert_image_data);
            }
          insert_data(image_data);
        }
    });
}

function unsplash_background_search(type,page) {
    console.log("背景搜尋");
    console.log("搜尋關鍵字"+type);
    let image_insert_data = [];
    let count = 0;
    baseUrl = 'https://unsplash.com/napi/search/photos?query='+type+'&xp=&per_page=20&page='+page+''
    request(baseUrl, function (error, response, body) {
        let data = JSON.parse(body);
        let total_amount = data.results.length;
        if (!error && response.statusCode == 200) {             
            for(let j=0;j<total_amount;j++){                    
                let image_id = crypto.randomBytes(32).toString('hex').substr(0,8);
                let small_size = data.results[j].urls.small;
                //let author_name = data.results[j].user.name;
                //let author_website = data.results[j].user.links.html;
                let image_source_url = data.results[j].links.html;
                let provider = "unsplash";                           
                let insert_image_data = [image_source_url,small_size,provider,type,image_id];
                //let insert_author_data = [author_name,author_website,image_id];
                image_insert_data.push(insert_image_data);
                //author_insert_data.push(insert_author_data);
                //img_display_data.push(display_data);     
                // count +=1;
                // if(count==total_amount-1){
                    
                // }
                    
            }
            insert_data(image_insert_data);                    
        }                                   
    });      
};

//寫入資料庫
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






module.exports.pexels_background_search = pexels_background_search;
module.exports.unsplash_background_counter = unsplash_background_counter;
module.exports.pixabay_background_counter = pixabay_background_counter;
module.exports.kaboompics_background_counter = kaboompics_background_counter;