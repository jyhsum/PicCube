const express = require('express')
const app = express.Router();
const mysql = require("../util/mysqlcon.js");
const first_search = require("../util/first_search.js");
const {Translate} = require('@google-cloud/translate');
const projectId = 'jyhsum';
const translate = new Translate({
  projectId: projectId,
});


function translate_keyword(keyword){
  return new Promise((mainResolve, mainReject) => {
    const text = keyword;
    const target = 'en';
    translate
      .translate(text, target)
      .then(results => {
        const translation = results[0];
        return mainResolve (translation);
      })
      .catch(err => {
        console.error('ERROR:', err);
      });
  });
}


//輸入框打完字後按下Go開始搜尋圖片並把 API 給前端
app.get('/:keyword', function(req, res) {
  let paging=parseInt(req.query.paging);
  if (!paging) {
    paging = 0;
  }
  let search_keyword = req.params.keyword;
  if (check_validStr(search_keyword)) {
    res.send({status:404, data:""});
  }
  else {
    if (escape(search_keyword).indexOf("%u") !=-1) {
      translate_keyword(search_keyword).then(function(translate_result){
        start_search(paging,translate_result.toLowerCase(),search_keyword).then(function(search_result) {
          similar_keyword(translate_result.toLowerCase()).then((result)=>{
            if (result.similar_result) {
              res.send({search_result:search_result,similar_result:result.similar_result});
            }
            else {
              res.send({search_result:search_result});
            }
          });
        });
      });
    }
    else {
      start_search(paging,search_keyword,search_keyword).then(function(search_result) {
        similar_keyword(search_keyword).then((result)=>{
          if (result.similar_result) {
            res.send({search_result:search_result,similar_result:result.similar_result});
          }
          else {
            res.send({search_result:search_result});
          }
        });
      });
    }
  }
});


function check_validStr(str) {
  let validStr = new Array("<",">",".","!","\/","\\");
  for (let i=0;i<validStr.length;i++) { 
    for (let j=0;j<str.length;j++) {
      ch=str.substr(j,1);
      if (ch==validStr[i]) { 
        return true; //如果包含禁止字元回傳true
      }
    } 
  } 
}

function start_search(paging,search_keyword,origin_keyword) {
  return new Promise((mainResolve, mainReject) => {
    //Search keyword in database first
    mysql.pool.getConnection(function(error, connection) {
      if(error){
        console.log(error);
        return mainReject({error:"Error in connection database."});
      }
      connection.query('SELECT `image_id` , `image_url`, `image_source_url` FROM `image_data` WHERE `tag` = "'+search_keyword+'"order by `image_id` DESC;',function(error, results, fields){
        connection.release();
        if(error){
          console.log(error);
          return mainReject({error:"Query image_data Error"});
        }
        else{
          let total = results.length;
          let total_page = Math.ceil(total/10);
          let lastPageCount = total%10;
          if(results.length>1){
              if (paging > total_page-1){
                return mainResolve({"error": "Invalid token."});
              }
              else if(paging==total_page-1){
                let display_data = [];
                let data_start = paging*10;
                let data_end = paging*10+lastPageCount-1;                   
                for(let i =data_start;i<=data_end;i++){
                  display_data.push(results[i]);
                }
                return mainResolve({
                  note:"Search from Database.",
                  tag:origin_keyword,
                  total_images:total,
                  total_page:total_page,
                  data:display_data
                });
              }
              else{
                let display_data = [];
                let data_start = paging*10;
                let data_end = paging*10+9;
                for(let i =data_start;i<=data_end;i++){
                  display_data.push(results[i]);
              }    
                return mainResolve({
                  note:"Search from Database.",
                  total_images:total,
                  total_page:total_page,
                  tag:origin_keyword,
                  paging: paging+1, 
                  data:display_data
                });                
              }              
          }    
          //If keyword is not in database, add new pic
          else{          
            console.log("key word is not in DB");
            first_search.is_chinese(search_keyword).then((first_search_result)=>{
              let output = first_search_result.data;
              similar_keyword(search_keyword).then((result)=>{
                if(result.similar_result){
                  return mainResolve({note:"Search from internet.",tag:search_keyword,data:output,similar_search:result.similar_result,origin_keyword:origin_keyword});
                }
                else{
                  return mainResolve({note:"Search from internet.",tag:search_keyword,data:output,origin_keyword:origin_keyword});
                }
              });
            });
          }    
        }     
      });  
    });
  });
}

function similar_keyword(search_keyword){
  return new Promise((mainResolve, mainReject) => {
    let new_keyword = "%"+String(search_keyword.split("")).replace(/,/g,"%")+"%";
    mysql.pool.getConnection(function(error, connection) {
      if(error){
        console.log(error);
        return mainReject({error:"Error in connection database."});
      }
      connection.query('SELECT `tag_name` from `tag` where `tag_name` like "'+new_keyword+'" LIMIT 0,5;',function(error, similar_result, fields){
        connection.release();
        if(error){
          console.log(error);
          return mainReject({error:"Query image_data Error"});
        }
        else{
          let similar_words = [];
          if(similar_result.length>0){
            for(let i=0;i<similar_result.length;i++){
              if(similar_result[i].tag_name.toLowerCase() !== search_keyword.toLowerCase()){
                similar_words.push(similar_result[i].tag_name);
              }   
            }
            return mainResolve({similar_result:similar_words});
          }
          else{
            return mainResolve({similar_result:null});;
          }
        }
      });
    });
  });
}

module.exports = app ;