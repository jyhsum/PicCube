//離開這個頁面時將localstroage內喜愛的圖片編號存到資料庫 & 將破圖id傳到後端再從資料庫刪掉
window.onbeforeunload = function(){ 
    let item = localStorage.getItem('like_item');
    if(item){
      let token = getCookie("Authorization");
      if(check_user_name() && (item)){  //如果token還沒過期
        let xhttp = new XMLHttpRequest();
        xhttp.open("POST", "/edit_like_image", true);
        xhttp.onload = function() {
          if (this.readyState == 4 && this.status == 200) {
            console.log(this.responseText);
            
          }
        };
        xhttp.onerror = function() { reject("Error") };;
        xhttp.setRequestHeader("Content-Type", "application/json");
        xhttp.setRequestHeader("Authorization", "Bearer "+token);
        xhttp.send(item);
      }
      else{ //token 過期了 請user重新登入
        window.alert("Please Sign in to continue your change.");
      }
    }
  
    let broken_id_list = localStorage.getItem('broken_image');  
    if(broken_id_list){
      let xhttp = new XMLHttpRequest();
      xhttp.open("POST", "/delete_broken_image", true);
      xhttp.onload = function() {
        if (this.readyState == 4 && this.status == 200) {
          console.log(this.responseText);
        }
      };
      xhttp.onerror = function() { reject("Error") };;
      xhttp.setRequestHeader("Content-Type", "application/json");
      xhttp.send(JSON.stringify({broken_id:broken_id_list}));
      
    }
  
  };





  
function error_pic(image_id){
    console.log(image_id);
    //把破圖的 img 跟 button 都隱藏
    let broken_image_button = document.getElementsByClassName(image_id)[0];
    broken_image_button.style.display = "none";
    let broken_image = document.querySelector("img[alt='"+image_id+"']");
    broken_image.style.display = "none";
    //把破圖的id 存到local storage
    let storageArray = JSON.parse(localStorage.getItem('broken_image')) || [];
    storageArray.push({image_id:image_id, note:"broken_image_id"});
    localStorage.setItem('broken_image',JSON.stringify(storageArray));
}




  function show_like_status(data){
    for(let i=0;i<data.length;i++){
      let button = document.getElementsByClassName(data[i].image_id)[0];
      if(button){
        button.classList.replace("unclicked","clicked");
      }
    }
   };


   function check_user_name(){
    return new Promise((mainResolve, mainReject) => {
      let token = getCookie("Authorization");
      if(token){
        let r = new XMLHttpRequest();
        r.open("POST", "/member", true);
        r.onreadystatechange = function () {
        if (r.readyState != 4 || r.status != 200) return;
        let status = JSON.parse(r.responseText).status;
        let user_name = JSON.parse(r.responseText).user_name;
        let like_image_info = JSON.parse(r.responseText).like_image_info;
        if(status == 200){
          return mainResolve({user_name:user_name , like_image_info:like_image_info});
        }
        else if(r.responseText == 403){
          
          console.log(r.responseText);
          delete_cookies(); //刪除cookies
        }
        else{
          console.log(r.responseText);
          delete_cookies(); //刪除cookies
        }
      };
        r.setRequestHeader("Authorization", "Bearer "+token);
        r.setRequestHeader("Content-Type", "application/json");
        r.send();
      }
    });
   }

   function check_login_status(){
    return new Promise((mainResolve, mainReject) => {
      let token = getCookie("Authorization");
      if(token){
        check_user_name().then(function(result){
          console.log(result);
          if(result.user_name!="NULL"){
            document.getElementById("profile_button").innerText = result.user_name;
            document.getElementById("sign_in_button").style.display = "none";
            document.getElementById("sign_up_button").style.display = "none";
            return mainResolve(result.like_image_info);
          }
          else{ //token錯誤或逾期
            document.getElementById("profile_button").style.display = "none";
            document.getElementById("log_out_button").style.display = "none";
            return mainResolve();
          }    
        });
      }
      else{
        document.getElementById("profile_button").style.display = "none";
        document.getElementById("log_out_button").style.display = "none";
        return mainResolve();
      }
    });
   };


   function getCookie(cname){   
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i=0; i<ca.length; i++) {
        var c = ca[i].trim();
        if (c.indexOf(name)==0) return c.substring(name.length,c.length);
    }
    return "";
  }

  function logout(){		
    let keys = document.cookie.match(/[^ =;]+(?=\=)/g);
    let check = confirm("Are you sure to log out?");
      if(keys && check) {
        for(var i = keys.length; i--;)
        document.cookie = keys[i] + '=0;expires=' + new Date(0).toUTCString();
        window.location="/";
      }
  }

  function delete_cookies(){		
    let keys = document.cookie.match(/[^ =;]+(?=\=)/g);
      if(keys) {
        for(var i = keys.length; i--;)
        document.cookie = keys[i] + '=0;expires=' + new Date(0).toUTCString();
        window.location="/";
      }
  }
