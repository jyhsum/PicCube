window.onload = function(){
  let api_data = loadHotPic();
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


function get_pic_column_data(image_data){
  return new Promise((mainResolve, mainReject) => {
    let total_count = image_data.data.length;
    let image_for_column_1 =[];
    let image_for_column_2 =[];
    let image_for_column_3 =[];
    for(let i=0;i<total_count;i++){
      if(i%3==0){
        image_for_column_1.push(image_data.data[i]);
      }
      else if(i%3==1){
        image_for_column_2.push(image_data.data[i]);
      }
      else if(i%3==2){
        image_for_column_3.push(image_data.data[i]);
      }     
    }
    return mainResolve ({image_for_column_1:image_for_column_1,image_for_column_2:image_for_column_2,image_for_column_3:image_for_column_3});
  });
}





// //離開這個頁面時將localstroage內喜愛的圖片編號存到資料庫 & 將破圖id傳到後端再從資料庫刪掉
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
        div.innerHTML = "<a href='"+imageinfo[z].image_source_url+"'target='_blank' >Source</a>"+"<img src='"+imageinfo[z].image_url+"' alt='"+imageinfo[z].image_id+"' class='hot_image' border='0' onerror='error_pic(\""+imageinfo[z].image_id +"\")' />";parent_pic_column[column_order].appendChild(div); 
        addLikeButton("pic_div",imageinfo[z]);

    }

 }

//  function error_pic(image_id){
//   //把破圖的 img 跟 button 都隱藏
//   let broken_image_button = document.getElementsByClassName(image_id)[0];
//   broken_image_button.style.display = "none";
//   let broken_image = document.querySelector("img[alt='"+image_id+"']");
//   broken_image.style.display = "none";

//    //把破圖的id 存到local storage
//   let storageArray = JSON.parse(localStorage.getItem('broken_image')) || [];
//   storageArray.push({image_id:image_id, note:"broken_image_id"});
//   localStorage.setItem('broken_image',JSON.stringify(storageArray));
  
//  }


 function addLikeButton(obj,imageinfo){
    let parent_pic_div = document.getElementsByClassName(obj);
    let button = document.createElement("button");
    if(imageinfo.likes){
      button.innerHTML = imageinfo.likes+" likes";
    }
    button.onclick = press_like;
    for(let i=0;i<parent_pic_div.length;i++){
      button.setAttribute("class", imageinfo.image_id);
      button.classList.add("unclicked");
      parent_pic_div[i].appendChild(button);
    }
    
 }

 


//  function check_login_status(){
//   return new Promise((mainResolve, mainReject) => {
//     let token = getCookie("Authorization");
//     if(token){
//       check_user_name().then(function(result){
//         if(result.like_image_info!="NULL"){
//           document.getElementById("profile_button").innerText = result.user_name;
//           document.getElementById("sign_in_button").style.display = "none";
//           document.getElementById("sign_up_button").style.display = "none";
//           //show_like_status(result.like_image_info);
//           return mainResolve(result.like_image_info);
//         }
//         else{
//           document.getElementById("profile_button").innerText = result.user_name;
//           document.getElementById("sign_in_button").style.display = "none";
//           document.getElementById("sign_up_button").style.display = "none";
//           return mainResolve(result.like_image_info);
//         }    
//       });
//     }
//     else{
//       document.getElementById("profile_button").style.display = "none";
//       document.getElementById("log_out_button").style.display = "none";
//       return mainResolve();
//     }
//   });
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

//  function show_like_status(data){
//   for(let i=0;i<data.length;i++){
//     let button = document.getElementsByClassName(data[i].image_id)[0];
//     if(button){
//       button.classList.replace("unclicked","clicked");
//     }
//   }
//  };



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





//  function getCookie(cname){   
//   var name = cname + "=";
//   var ca = document.cookie.split(';');
//   for(var i=0; i<ca.length; i++) {
//       var c = ca[i].trim();
//       if (c.indexOf(name)==0) return c.substring(name.length,c.length);
//   }
//   return "";
// }

function delete_cookies(){		
  let keys = document.cookie.match(/[^ =;]+(?=\=)/g);
    if(keys) {
      for(var i = keys.length; i--;)
      document.cookie = keys[i] + '=0;expires=' + new Date(0).toUTCString();
      window.location="/";
    }
}



// function logout(){		
//   let keys = document.cookie.match(/[^ =;]+(?=\=)/g);
//   let check = confirm("Are you sure to log out?");
//     if(keys && check) {
//       for(var i = keys.length; i--;)
//       document.cookie = keys[i] + '=0;expires=' + new Date(0).toUTCString();
//       window.location="/";
//     }
// }






