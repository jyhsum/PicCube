window.onload = function() {
  const api_data = loadHotPic();
  check_login_status()
  .then(function(login_status_result) {
    api_data.then(function(result) {
      let image_data = JSON.parse(result);
      get_pic_column_data(image_data).then(function(pic_column_data) {
        addElementDiv("recommand_pic",pic_column_data.image_for_column_1,0);
        addElementDiv("recommand_pic",pic_column_data.image_for_column_2,1);
        addElementDiv("recommand_pic",pic_column_data.image_for_column_3,2);
      });
    }).then(()=>{
      if(login_status_result) {
        show_like_status(login_status_result);
      }
    })
  });
  localStorage.removeItem('like_item');
  localStorage.removeItem('broken_image');
};



function get_pic_column_data(image_data) {
  return new Promise((mainResolve, mainReject) => {
    let total_count = image_data.data.length;
    let image_for_column_1 =[];
    let image_for_column_2 =[];
    let image_for_column_3 =[];
    for(let i=0;i<total_count;i++) {
      if(i%3==0){
        image_for_column_1.push(image_data.data[i]);
      }
      else if(i%3==1) {
        image_for_column_2.push(image_data.data[i]);
      }
      else if(i%3==2) {
        image_for_column_3.push(image_data.data[i]);
      }     
    }
    return mainResolve ({image_for_column_1:image_for_column_1,image_for_column_2:image_for_column_2,image_for_column_3:image_for_column_3});
  });
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
        div.innerHTML = "<a href='"+imageinfo[z].image_source_url+"'target='_blank' >SOURCE</a>"+"<img src='"+imageinfo[z].image_url+"' class='hot_image' border='0' onerror='error_pic(\""+imageinfo[z].image_id +"\")' />";parent_pic_column[column_order].appendChild(div); 
        addLikeButton("pic_div",imageinfo[z]);

    }

 }




 function addLikeButton(obj,imageinfo){
    let parent_pic_div = document.getElementsByClassName(obj);
    let button = document.createElement("button");
    if(imageinfo.likes){
      button.innerHTML = imageinfo.likes+" LIKES";
    }
    button.onclick = press_like;
    for(let i=0;i<parent_pic_div.length;i++){
      button.setAttribute("class", imageinfo.image_id);
      button.classList.add("unclicked");
      parent_pic_div[i].appendChild(button);
    }
    
 }





 function press_like(){
    let storageArray = JSON.parse(localStorage.getItem('like_item')) || [];
    let token = getCookie("Authorization");
    let image_id = this.className.split(" ")[0]; //這是button的class name 
    let click_status = this.className.split(" ")[1];
    let button = document.getElementsByClassName(image_id)[0];
    let likes = parseInt(document.getElementsByClassName(image_id)[0].innerHTML[0]);
    if(token){
      switch (click_status) {
        case 'clicked': //取消喜歡
          console.log(image_id);
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
          button.innerHTML = likes-1+" likes";
          break;
        case 'unclicked': //按下喜歡
          storageArray.push({image_id:image_id, action:"add_like"});
          localStorage.setItem('like_item',JSON.stringify(storageArray));
          button.classList.replace("unclicked","clicked");
          button.innerHTML = likes+1+" likes";
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

 function loadHotPic() {
  return new Promise( (resolve, reject) => {
    let xhttp = new XMLHttpRequest();
    xhttp.open("GET", "/hot_image", true);
    xhttp.onload = function() {
      if (this.readyState == 4 && this.status == 200) {
        resolve (this.responseText);
      }
    };
    xhttp.onerror = function() { reject("Error") };
    xhttp.send();
  })
}



function delete_cookies(){		
  let keys = document.cookie.match(/[^ =;]+(?=\=)/g);
    if(keys) {
      for(var i = keys.length; i--;)
      document.cookie = keys[i] + '=0;expires=' + new Date(0).toUTCString();
      window.location="/";
    }
}
