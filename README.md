# [PicCube](https://jyhsum.com)
### A website helps you to search beautiful wallpapers

## Ficture

* Enter the keyword in the search bar, pictures will be displayed
* PicCube will search the data from other populor websites
* By clicking the "source" button on the pictures, user can go to origin websites and download the pictures
* PicCube doesn't store original file but store urls instead
* Users can register with email or Facebook
* After login, users can add the picture they like and check the list on profile page
* Also, PicCube allows user to upload their own profile picture
* Popular Wallpapers of the week will be displayed on home page
* PicCube now has 300,000+ image, now let's get started!

## Procedures
* Show popular wallpapers and total like amount on home page
* Check login status first on every page, if user's loggined, show user's name on the header 
* If there are any picture on the page user has clicked like,turn like button into red
* Store the image id in localstorage first after user click or unclick like button and send the data to backend after user leave the page
* After user input search keyword, search from database first, if there isn't any matching result, PicCube will start web crawing, otherwise, PicCube shows all corresponding pictures
* While PicCube starts web crawing, in order to decrease waiting time, PicCube will reture some pictures on the page first, and keep crawing in background, while user scroll down the page, PicCube will continuously provide new pictures till run out of data


## Technologies
### Backend
Node.js / Express
Web Crawling 
NGINX
JWT Authentication	

### Front-End
HTML
CSS
RWD
jQuery
JavaScript	

### AWS Cloud Platform
EC2
S3
CloudFront (CDN)
Elastic Load Balancer	

### Tools
Git
Mocha (Unit Test)
Docker

### Database 
MySQL 


### Third Party
Facebook Login API
Google translation API

### Error handling
* Show not found, when user input bad search keyword.
 ![](https://i.imgur.com/pU6ufZX.png)
* If there are any broken picture, hide them first, and store the image ids in localstorage, after user leave the page, send the data to backend and delete them from database


### Database Schema


### Architecture

![](https://i.imgur.com/5CF1w3z.png)


### API documentation












