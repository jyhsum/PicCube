
//檢查token
window.onload = function(){
  localStorage.removeItem('like_item');
  let token = getCookie("Authorization");
    if(token){
      let r = new XMLHttpRequest();
      r.open("POST", "/member", true);
      r.onreadystatechange = function () {
      if (r.readyState != 4 || r.status != 200) return;
        let status = JSON.parse(r.responseText).status;
        if(status == 200){
          //console.log(r.responseText);
          create_image(r.responseText,"user_pic");
          change_display_name(JSON.parse(r.responseText).user_name);
          insert_total_likes(JSON.parse(r.responseText).total_likes);
          insert_profile_pic(JSON.parse(r.responseText).user_pic);
          show_like_status(JSON.parse(r.responseText).like_image_info);
          document.getElementById("profile_button").innerText = JSON.parse(r.responseText).user_name;

        }
        else if(r.responseText == 403){
          console.log(r.responseText);
          window.alert("Session expired!Please login.");
          window.location="/login.html#tab02";
        }
        else{
          console.log(r.responseText);
          window.alert("Session expired!Please login.");
          window.location="/login.html#tab02";
        }
      };
      r.setRequestHeader("Authorization", "Bearer "+token);
      r.setRequestHeader("Content-Type", "application/json");
      r.send();
    }
    else{
        window.alert("Session expired!Please login.");
        window.location="/login.html#tab02";
    }

  let fileUploader = document.getElementById('file-uploader');
    if(fileUploader){
      fileUploader.addEventListener('change', (e) => {
        check_file_size(e.target.files[0]); //先確認檔案大小再上傳
    });
  }
}


function check_file_size(file){
  let maxsize = 2*1024*1024; //2M
  let size = document.getElementById("file-uploader").files.item(0).size;
  if (size > maxsize) {
      alert("Upload file cannot be bigger than 2M !");
  }
  else{
    sent_file(file);
  }
}




//離開這個頁面時將localstroage內取消喜愛的圖片編號存到資料庫
// window.onbeforeunload = function(){
//   let item = localStorage.getItem('like_item');
//   let token = getCookie("Authorization");
//   if(check_user_name() && (item)){  //如果token還沒過期以及localstroage有資料
//     let xhttp = new XMLHttpRequest();
//     xhttp.open("POST", "/edit_like_image", true);
//     xhttp.onload = function() {
//       if (this.readyState == 4 && this.status == 200) {
//         console.log(this.responseText);

//       }
//     };
//     xhttp.onerror = function() { reject("Error") };;
//     xhttp.setRequestHeader("Content-Type", "application/json");
//     xhttp.setRequestHeader("Authorization", "Bearer "+token);
//     xhttp.send(item);
//   }
//   else{ //token 過期了 請user重新登入
//     window.alert("Please Sign in to continue your change.");
//   }


//   let broken_id_list = localStorage.getItem('broken_image');
//   if(broken_id_list){
//     let xhttp = new XMLHttpRequest();
//     xhttp.open("POST", "/delete_broken_image", true);
//     xhttp.onload = function() {
//       if (this.readyState == 4 && this.status == 200) {
//         console.log(this.responseText);
//       }
//     };
//     xhttp.onerror = function() { reject("Error") };;
//     xhttp.setRequestHeader("Content-Type", "application/json");
//     xhttp.send(JSON.stringify({broken_id:broken_id_list}));

//   }


// };





//fetch 將檔案傳到後端
function sent_file(file){
  let token = getCookie("Authorization");
  let form = new FormData();
  form.append("upload_pic", file);
  fetch('/upload_user_pic', {
    method: 'POST',
    body: form,
    headers: new Headers({
      "Authorization": "Bearer "+token
    })
  })
  .then(response => response.json())
  .catch(error => console.error('Error:', error))
  .then(response => console.log('Success:', response))
  .then(showPreviewImage(file))

}

function showPreviewImage(fileObj) {
  const imagePreview = document.getElementsByClassName('user_pic_url')[0];
  const image = URL.createObjectURL(fileObj);
  imagePreview.src = image;
  document.getElementById('file-uploader').value ="";
}








//Get token from cookie
// function getCookie(cname){
//   let name = cname + "=";
//   let ca = document.cookie.split(';');
//   for(let i=0; i<ca.length; i++) {
//     let c = ca[i].trim();
//     if (c.indexOf(name)==0) return c.substring(name.length,c.length);
//   }
//   return "";
// }



 function create_image (data) {
    let image_data = JSON.parse(data);
    let total_count = image_data.like_image_info.length;
    if(image_data.like_image_info!='NULL'){
      let image_first_column =[];
      let image_second_column =[];
      let image_third_column =[];
      for(let i=0;i<total_count;i++){
          if(i%3==0){
              image_first_column.push(image_data.like_image_info[i]);
          }
          else if(i%3==1){
              image_second_column.push(image_data.like_image_info[i]);
          }
          else{
              image_third_column.push(image_data.like_image_info[i]);
          }
      }

      let image_for_column=[];
      image_for_column[0] = image_first_column;
      image_for_column[1] = image_second_column;
      image_for_column[2] = image_third_column;
      for(let i=0;i<3;i++){
        addElementDiv("recommand_pic",image_for_column[i],i);
      }
    }
 };



 function addElementDiv(obj,imageinfo,column_order) {
  let parent = document.getElementsByClassName(obj);
  let div = document.createElement("div");
  div.setAttribute("class", "pic_column");
  parent[0].appendChild(div);
  addImgDiv("pic_column",imageinfo,column_order);
}

function addImgDiv(obj,imageinfo,column_order) {
    if(imageinfo.length>0){
        let parent_pic_column = document.getElementsByClassName(obj);
        for(let z=0; z< imageinfo.length; z++){
            let div =  document.createElement("div");
            div.setAttribute("class", "pic_div");
            div.innerHTML = "<a href='"+imageinfo[z].image_source_url+"'target='_blank' >Source</a>"+"<img src='"+imageinfo[z].image_url+"' alt='"+imageinfo[z].image_id+"' class='hot_image' border='0' onerror='error_pic(\""+imageinfo[z].image_id +"\")' />";
            parent_pic_column[column_order].appendChild(div);
            addLikeButton("pic_div",imageinfo[z]);

        }
    }
}




function change_display_name(name){
  document.getElementsByClassName("user_name")[0].innerText = name;
}

function insert_total_likes(likes_count){
  if(likes_count)
  document.getElementsByClassName("like_info")[0].innerHTML = likes_count+" likes";
}

function insert_profile_pic(url){

  if(url!='null'){
    document.getElementsByClassName("user_pic_url")[0].src = url;
  }
  else{
    document.getElementsByClassName("user_pic_url")[0].src = "https://s3.us-east-2.amazonaws.com/jyhsum/default_profile_pic.png";
  }
}



// function logout(){
//     let keys = document.cookie.match(/[^ =;]+(?=\=)/g);
//       if(keys) {
//         for(var i = keys.length; i--;)
//         document.cookie = keys[i] + '=0;expires=' + new Date(0).toUTCString();
//         window.location="/";
//       }
//   }



  function addLikeButton(obj,imageinfo){
    let parent_pic_div = document.getElementsByClassName(obj);
    let button = document.createElement("button");
    button.innerHTML = "Like";
    button.onclick = press_like_member_page;
    for(let i=0;i<parent_pic_div.length;i++){
      button.setAttribute("class", imageinfo.image_id);
      button.classList.add("unclicked");
      parent_pic_div[i].appendChild(button);
    }

 }

 function press_like_member_page(){ //正常情況只會顯示喜歡過的圖片
  let storageArray = JSON.parse(localStorage.getItem('like_item')) || [];
  let token = getCookie("Authorization");
  let image_id = this.className.split(" ")[0]; //這是button的class name
  let click_status = this.className.split(" ")[1];
  let button = document.getElementsByClassName(image_id)[0];
  if(token){
    switch (click_status) {
      case 'unclicked': //喜歡
        console.log(image_id);
        //找目前localStorage有沒有已儲存的 如果有代表user在同一個頁面點喜歡又取消
        let id_list = get_id_list(storageArray); //先取出id轉成陣列
        let repest_id_index = id_list.indexOf(image_id); //找出重複id的index值

        if(repest_id_index ==-1){  //代表不是在同一個頁面點喜歡又取消
          console.log("-1");
          storageArray.push({image_id:image_id, action:"add_like"});
          localStorage.setItem('like_item',JSON.stringify(storageArray));

        }
        else{
          console.log("else");
          storageArray.splice(repest_id_index, 1);
          localStorage.removeItem('like_item');
          localStorage.setItem('like_item',JSON.stringify(storageArray));

        }
        button.classList.replace("unclicked","clicked");
        break;
      case 'clicked': //取消喜歡
        storageArray.push({image_id:image_id, action:"cancel_like"});
        localStorage.setItem('like_item',JSON.stringify(storageArray));
        button.classList.replace("clicked","unclicked");
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



// function show_like_status(data){
//   for(let i=0;i<data.length;i++){
//     let button = document.getElementsByClassName(data[i].image_id)[0];
//     if(button){
//       button.classList.replace("unclicked","clicked");
//     }
//   }

//  };

//  function check_user_name(){
//   return new Promise((mainResolve, mainReject) => {
//     let token = getCookie("Authorization");
//     if(token){
//       let r = new XMLHttpRequest();
//       r.open("POST", "/member", true);
//       r.onreadystatechange = function () {
//       if (r.readyState != 4 || r.status != 200) return;
//       let status = JSON.parse(r.responseText).status;
//       let user_name = JSON.parse(r.responseText).user_name;
//       let like_image_info = JSON.parse(r.responseText).like_image_info;
//       if(status == 200){
//         return mainResolve({user_name:user_name , like_image_info:like_image_info});
//       }
//       else if(r.responseText == 403){

//         console.log(r.responseText);
//         delete_cookies(); //刪除cookies
//       }
//       else{
//         console.log(r.responseText);
//         delete_cookies(); //刪除cookies
//       }
//     };
//       r.setRequestHeader("Authorization", "Bearer "+token);
//       r.setRequestHeader("Content-Type", "application/json");
//       r.send();
//     }
//   });
//  }