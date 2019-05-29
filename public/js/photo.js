window.onload = function(){
  localStorage.removeItem('like_item');
  localStorage.removeItem('broken_image');
  let search_param = new URL(location.href).search.slice(8).replace(/\+/g, " ");
  let search_key = document.getElementsByClassName("search_key")[0];
  let decode_param = fn_decodeURI(search_param);
  let loader = document.getElementsByClassName("lds-roller")[0];
  check_login_status().then(function(login_status_result) {
    loadDoc(decode_param).then(function(result) {
      let image_data = JSON.parse(result);
      if(image_data.search_result &&image_data.search_result.data.length>0){
        search_key.innerHTML = capitalizeFirstLetter(decode_param) +" Photos"; //capitalize first letter
        if(image_data.similar_result && image_data.similar_result.length>0){
          similar_keyword(image_data.similar_result);
        }
        if(image_data.search_result.data.length<10){ //images fewer then 10 , this means there will be only 1 paging hide loader
          loader.style.display = "none";
        }
        get_pic_column_data(image_data).then(function(pic_column_data) {
          addElementDiv("recommand_pic",pic_column_data.image_for_column_1,0);
          addElementDiv("recommand_pic",pic_column_data.image_for_column_2,1);
          addElementDiv("recommand_pic",pic_column_data.image_for_column_3,2);
        }); 
      }
      else{ //didn't find any images.
        search_key.innerHTML = 'Oops! "'+search_param+'" did not match any image results.</br>Please try another keyword.';
        loader.style.display = "none";
      }
    }).then(()=>{
      if(login_status_result) {
        show_like_status(login_status_result);
      }
    })
  })
};

function fn_decodeURI(str_url) {
  str_url = str_url.replace(/\n/g,"");
  let dec = decodeURI(str_url);
  return dec;
}



function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}


//相似推薦
function similar_keyword(similar_result){  
  let similar_key = document.getElementsByClassName("similar_key")[0];
  similar_key.innerHTML = "Similar search : ";
  for(let i=0;i<similar_result.length;i++){
    let createA = document.createElement('a');
    let createAText = document.createTextNode(similar_result[i]);
    createA.setAttribute('href', '/photo.html?search='+similar_result[i]);
    createA.appendChild(createAText);
    similar_key.appendChild(createA);
  }
}


function get_pic_column_data(image_data){
  return new Promise((mainResolve, mainReject) => {
    let total_count = image_data.search_result.data.length;
    let image_for_column_1 =[];
    let image_for_column_2 =[];
    let image_for_column_3 =[];
    for(let i=0;i<total_count;i++){
      if(i%3==0){
        image_for_column_1.push(image_data.search_result.data[i]);
      }
      else if(i%3==1){
        image_for_column_2.push(image_data.search_result.data[i]);
      }
      else if(i%3==2){
        image_for_column_3.push(image_data.search_result.data[i]);
      }     
    }
    return mainResolve ({image_for_column_1:image_for_column_1,image_for_column_2:image_for_column_2,image_for_column_3:image_for_column_3});
  });
}


function loadDoc(search_param) {
  return new Promise( (resolve, reject) => {
  let xhttp = new XMLHttpRequest();
  xhttp.open("GET", "/photo/"+search_param+"", true);
  xhttp.onload = function() {
    if (this.readyState == 4 && this.status == 200) {
      return resolve (this.responseText);
    }
  };
  xhttp.onerror = function() { reject("Error") };
  xhttp.send();
  })
}

function addElementDiv(obj,imageinfo,column_order) {
  let parent = document.getElementsByClassName(obj);
  let div = document.createElement("div");
  div.setAttribute("class", "pic_column");
  parent[0].appendChild(div);
  addImgDiv("pic_column",imageinfo,column_order);
}

function addImgDiv(obj,imageinfo,column_order) {
  let parent_pic_column = document.getElementsByClassName(obj);
  for(let z=0; z< imageinfo.length; z++){
      let div =  document.createElement("div");
      div.setAttribute("class", "pic_div");
      div.setAttribute("id", imageinfo[z].image_id);
      div.innerHTML = "<a href='"+imageinfo[z].image_source_url+"' target='_blank' >SOURCE</a>"+"<img src='"+imageinfo[z].image_url+"' class='hot_image' border='0' onerror='error_pic(\""+imageinfo[z].image_id +"\")' />";
      parent_pic_column[column_order].appendChild(div);
      let button = document.createElement("button");
      button.innerHTML = "+LIKE";
      button.onclick = press_like;
      button.setAttribute("class", imageinfo[z].image_id);
      button.classList.add("unclicked");
      div.appendChild(button);      
  }
}

function press_like(){
  let storageArray = JSON.parse(localStorage.getItem('like_item')) || [];
  let token = getCookie("Authorization");
  let image_id = this.className.split(" ")[0]; //這是button的class name 
  let click_status = this.className.split(" ")[1];
  let button = document.getElementsByClassName(image_id)[0];
  if(token){
    switch (click_status) {
      case 'clicked': //取消喜歡
        //找目前localStorage有沒有已儲存的 如果有代表user在同一個頁面點喜歡又取消
        let id_list = get_id_list(storageArray); //先取出id轉成陣列
        let repest_id_index = id_list.indexOf(image_id); //找出重複id的index值
        if(repest_id_index ==-1){  //代表不是在同一個頁面點喜歡又取消
          storageArray.push({image_id:image_id, action:"cancel_like"});
          localStorage.setItem('like_item',JSON.stringify(storageArray));
        }
        else{
          storageArray.splice(repest_id_index, 1); 
          localStorage.removeItem('like_item');
          localStorage.setItem('like_item',JSON.stringify(storageArray));
          
        }          
        button.classList.replace("clicked","unclicked");
        break;
      case 'unclicked': //按下喜歡
        storageArray.push({image_id:image_id, action:"add_like"});
        localStorage.setItem('like_item',JSON.stringify(storageArray));
        button.classList.replace("unclicked","clicked");
        break;
    }
  }
  else{
    window.alert("Please Sign in!");
  }

};

function get_id_list(data){
  let id_array =[];
  for(let i=0;i<data.length;i++){
    id_array.push(data[i].image_id);
  }
  return id_array
}


function read_new_pic(nextpage) {
  let search_param = new URL(location.href).search.slice(8);
  return new Promise( (resolve, reject) => {
   let xhttp = new XMLHttpRequest();
    xhttp.open("GET","/photo/"+search_param+"?paging="+nextpage, true);
    xhttp.onload = function() {
      if (this.readyState == 4 && this.status == 200) {
        return resolve (this.responseText);
      }
    };
    xhttp.onerror = function() { reject("Error") };
    xhttp.send();
  })
}



let page = 1;
let read_data_flag= true;
window.addEventListener('scroll', function(e) {
  let last_known_scroll_position = window.scrollY;
  let pic_column_height = document.getElementsByClassName("pic_column")[0].clientHeight;
  let loader = document.getElementsByClassName("lds-roller")[0];
  if (last_known_scroll_position+pic_column_height+500>=document.body.clientHeight) {
    if(!page){ //last page let loader disappear
      loader.style.display = "none"; 
      read_data_flag = false;
    }
    if(read_data_flag==true){
      read_data_flag = false;
      read_new_pic(page)
      .then(function(result) {
        let image_data = JSON.parse(result);
        let next_page = image_data.search_result.paging;
        if(page){
          get_pic_column_data(image_data).then(function(pic_column_data) {
          addImgDiv("pic_column",pic_column_data.image_for_column_1,0);
          addImgDiv("pic_column",pic_column_data.image_for_column_2,1);
          addImgDiv("pic_column",pic_column_data.image_for_column_3,2);
          page = next_page;
          read_data_flag = true;
        });       
        }
      })
      .then(function(){
        check_login_status().then(function(login_status_result) {
          if(login_status_result) {
            show_like_status(login_status_result);
          }
        });
      });
    }  
  }
});