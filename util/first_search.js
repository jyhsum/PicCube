// This app will run when user enter a new keyword
const request = require('request');
const crypto = require('crypto');
const nightmareHelper = require('nightmare-helper');
const superagent = require('superagent');
const charset = require('superagent-charset');
charset(superagent);
const cheerio = require('cheerio');
const {Translate} = require('@google-cloud/translate');
const projectId = 'jyhsum';
const translate = new Translate({
  projectId: projectId,
});
const background_search = require('../util/background_search.js');
const dao={
  image:require("../dao/new_image"),
};

// If search word is Chinese translate it to English before search.
const is_chinese = (type)=>{
  return new Promise((mainResolve, _mainReject) => {
    if (escape(type).indexOf('%u') !=-1) {
      translate_keyword(type).then(function(translate_result) {
        search_keyword = translate_result;
        first_search(search_keyword).then(function(first_search_result) {
          return mainResolve({data: first_search_result.data});
        });
      });
    } else {
      search_keyword = type;
      first_search(search_keyword).then(function(first_search_result) {
        return mainResolve({data: first_search_result.data});
      });
    }
  });
};

function first_search(type) {
  return new Promise((mainResolve, _mainReject) => {
    const search_keyword = type;
    pixabay(search_keyword).then(function(pixabay_result) {
      if (pixabay_result.status==404 || pixabay_result.status==400) {
        pixabay_result.data=[];
        pixabay_result.image_insert_data=[];
      }
      unsplash(search_keyword).then(function(unsplash_result) {
        if (unsplash_result.status==404||unsplash_result.status==400) {
          unsplash_result.data=[];
          unsplash_result.image_insert_data=[];
        }
        photoac(search_keyword).then(function(photoac_result) {
          if (photoac_result.status==404||photoac_result.status==400) {
            photoac_result.data=[];
            photoac_result.image_insert_data=[];
          }
          const first_result = unsplash_result.data.concat(pixabay_result.data).concat(photoac_result.data);
          if (first_result.length==0) { //use google search when other websited didn't find any result
            google(search_keyword).then(function(google_result) {
              console.log("start google search");
              if (google_result.status==404) {
                console.log("google no data");
                return mainResolve({data: []});
              }
              dao.image.insert_tag(type);
              dao.image.insert_image(google_result.image_insert_data)
                .catch(function(error){
                  console.log({error:error});
                });
              return mainResolve({data: google_result.data});
            });
          } else {
            dao.image.insert_tag(type);
            dao.image.insert_image(unsplash_result.image_insert_data.concat(pixabay_result.image_insert_data))
              .catch(function(error){
                console.log({error:error});
              });
            background_search.stocksnap_background_counter(type);
            return mainResolve({data: unsplash_result.data.concat(pixabay_result.data).concat(photoac_result.data)});
          }
        });
      });
    });
  });
}

function translate_keyword(keyword) {
  return new Promise((mainResolve, _mainReject) => {
    const text = keyword;
    const target = 'en';
    translate
      .translate(text, target)
      .then((results) => {
        const translation = results[0];
        return mainResolve(translation);
      })
      .catch((err) => {
        console.error('ERROR:', err);
      });
  });
}

const pixabay = (type)=>{
  return new Promise((mainResolve, _mainReject) => {
    const output_data = [];
    const baseUrl = 'https://pixabay.com/zh/images/search/'+search_keyword+'/?min_width=1920&min_height=1080&orientation=horizontal';
    superagent
      .get(baseUrl)
      .charset('utf-8')
      .end(function(err, sres) {
        if (err) {
          console.log('ERR: ' + err);
          return mainResolve({status: 400, msg: err});
        }
        const $ = cheerio.load(sres.text);
        // Didn't find any pictures.
        if (!$('div.flex_grid.credits.search_results div.item a').attr('href')) {
          return mainResolve({status: 404, provider: pixabay, data: ''});
        } else {
          const image_url = [];
          const image_source_url = [];
          const image_data=[];
          const total_page = $('form.add_search_params.pure-form.hide-xs.hide-sm.hide-md').text().trim().replace('/ ', '');
          if (total_page>1) {
            background_search.pixabay_background_counter(search_keyword, 2, total_page);
          }
          $('div.flex_grid.credits.search_results div.item a').each(function(_idx, element) {
            const $element = $(element);
            if ($element.attr('href').search('search')==-1) {
              image_source_url.push({image_source_url: 'https://pixabay.com'+$element.attr('href')});
            }
          });
          $('div.flex_grid.credits.search_results div.item a img').each(function(_idx, element) {
            const $element = $(element);
            if ($element.attr('src').search('blank.gif')==-1) {
              image_url.push({image_url: $element.attr('src')});
            }
          });
          for (let i=0; i<image_url.length; i++) {
            const image_id = crypto.randomBytes(32).toString('hex').substr(0, 8);
            const provider = 'pixabay';
            output_data.push({
              image_id: image_id,
              image_url: image_url[i].image_url,
              image_source_url: image_source_url[i].image_source_url,
              tag: type,
              provider: provider,
              author_name: 'null',
              author_website: 'null',
            });
              const insert_image_data = [image_source_url[i].image_source_url, image_url[i].image_url, provider, type, image_id];
              image_data.push(insert_image_data);
            }
            return mainResolve({
              status: 200,
              provider: 'pixabay',
              data: output_data,
              image_insert_data: image_data,
            });
          }
        });
  });
};

const unsplash = (type) =>{
  const baseUrl = 'https://unsplash.com/napi/search/photos?query='+type+'&xp=&per_page=20&page=1';
  return new Promise((mainResolve, _mainReject) => {
    request(baseUrl, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        const data = JSON.parse(body);
        const total_data = data.total;
        const total_pages = data.total_pages;
        let end_page=total_pages;
        if (total_data !='0' && total_pages>1) { // if more than 2 pages
          const image_insert_data = [];
          const img_display_data = [];
          if (total_pages>20) {
            end_page=20;
          }
          //background_search.unsplash_background_counter(search_keyword, 2, end_page);
          data.results.forEach(function(element) {
            const image_id = element.id;
            const small_size = element.urls.small;
            const image_source_url = element.links.html;
            const provider = 'unsplash';
            const tag = type;
            const insert_image_data = [image_source_url, small_size, provider, tag, image_id];
            image_insert_data.push(insert_image_data);
            const display_data ={
              image_id: image_id,
              image_url: small_size,
              image_source_url: image_source_url,
              tag: type,
              provider: 'unsplash',
            };
            img_display_data.push(display_data);
            return mainResolve({
              status: 200,
              provider: 'unsplash',
              data: img_display_data,
              image_insert_data: image_insert_data,
            });
          });
        } else {
          return mainResolve({status: 404, provider: 'unsplash', data: ''});
        }
      } else {
        return mainResolve({status: 400, msg: error});
      }
    });
  });
};

const google = (type)=>{
  return new Promise((mainResolve, _mainReject) => {
    const img_data = [];
    const img_display_data = [];
    options = {
      filters: '&tbs=isz:lt,islt:xga&tbm=isch',
      location: 'com',
      show: false,
      horizontalFlag: true,
    };
    nightmareHelper.googleImagesLong('"'+type+'"+wallpaper', options).then((result)=>{
      if (result.length>0) {
        for (let i = 0; i<result.length; i++) {
          const image_id = crypto.randomBytes(32).toString('hex').substr(0, 8);
          const data ={
            image_id: image_id,
            image_url: result[i].imageSrc,
            image_source_url: result[i].image_Source_URL,
            provider: 'google_search',
            tag: search_keyword,
          };
          const image_source_url = result[i].image_Source_URL;
          const regular_size = result[i].imageSrc;
          const provider = 'google_search';
          const tag = search_keyword;
          const insert_image_data = [image_source_url, regular_size, provider, tag, image_id];
          img_data.push(insert_image_data);
          img_display_data.push(data);
        }
        return mainResolve({
          status: 200,
          provider: 'google_search',
          data: img_display_data,
          image_insert_data: img_data,
        });
      } else {
        return mainResolve({status: 404, provider: 'google_search', data: ''});
      }
    });
  });
};

const photoac = (type)=>{
  return new Promise((mainResolve, _mainReject) => {
    let baseUrl = 'https://photo-ac.com/en/search-result?page=1&keyword='+type+'&per_page=100&order_by=popular';
    let image_url = [];
    let image_source_url = [];
    let output_data = [];
    let image_insert_data = [];
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
      let total_page = $('div.number-page input[type="number"]').attr("max");
      // Didn't find any pictures.
      if (total_page=='0') {
        return mainResolve({status: 404, provider: pixabay, data: ''});
      }      
      else if (total_page>1) {
        background_search.photoac_background_counter(search_keyword, 2, total_page);
      }
      $('figure.gallery-image-container a').each(function(idx, element) {          
        let $element = $(element);
        image_source_url.push({image_source_url:"https://photo-ac.com"+$element.attr('href')});
      });
      $('figure.gallery-image-container div.gallery-image noscript').each(function(idx, element) {          
        let $element = $(element);
        image_url.push({image_url:$element.html().substring(10,94)});
      });
      for (let i=0; i<image_url.length; i++) {
        const image_id = crypto.randomBytes(32).toString('hex').substr(0, 8);
        const provider = 'photoac';
        output_data.push({
          image_id: image_id,
          image_url: image_url[i].image_url,
          image_source_url: image_source_url[i].image_source_url,
          tag: type,
          provider: provider
        });
          const insert_image_data = [image_source_url[i].image_source_url, image_url[i].image_url, provider, type, image_id];
          image_insert_data.push(insert_image_data);
      }
      return mainResolve({
        status: 200,
        provider: 'photoac',
        data: output_data,
        image_insert_data: image_insert_data,
      });
    });
  });
};


module.exports.is_chinese = is_chinese;
