# [PicCube](https://jyhsum.com)
### A website helps you to search beautiful wallpapers

## Preview
![](https://i.imgur.com/cefp2EA.png)



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

## Error handling
* Show corresponding respond when user input bad search keyword.
 ![](https://i.imgur.com/pU6ufZX.png)
 
* If there are any broken picture, hide them first, and store the image ids in localstorage, after user leave the page, send the data to backend and delete them from database


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

## Architecture

![](https://i.imgur.com/5CF1w3z.png)

## Database Schema
![](https://i.imgur.com/2tpIIcg.png)

##### Designed with optimized database structure
* Database Normalization
* Proper index and foreign key setting
* Transaction
* Connection pool
* Optimized query syntex 

## API documentation
### Search API
* End Point: `/photo/search`
* Method:`GET`
* Query Parameters

|Field         | Type    |Description | 
|:------------:|:-------:|:----------:|
|keyword       | String  |Required    | 
|paging        | String(Optional)| Paging for request next page. | 


* Request Example:
`https://[HOST_NAME]/photo/apple` 
`https://[HOST_NAME]/photo/apple?paging=1`
* Success Response: 

|Field         | Type    |Description | 
|:------------:|:-------:|------------|
|note          | String  |The source of the search result| 
|tag           | String  |This is the search keyword| 
|data          | Array   |Array of Image Object| 
|paging        | Number  | If there are no more pages, server will not return paging parameter. |
|origin_keyword| String  |This is the keyword before translated.    | 
* Success Response Example:
    
1. When search keyword is in database.
```
{
    search_result: {
        note: "Search from Database.",
        total_images: 1823,
        total_page: 183,
        tag: "apple",
        paging: 2,
        data: [
            {
                image_id: "016aa7a54",
                image_url: "https://cdn.pixabay.com/photo/2013/12/14/01/45/leaves-228138__340.jpg",
                image_source_url: "https://pixabay.com/zh/photos/%E5%8F%B6%E5%AD%90-%E9%BB%84%E8%89%B2-%E7%A7%8B%E5%AD%A3-%E7%A7%8B%E5%A4%A9%E7%9A%84%E8%90%BD%E5%8F%B6-228138/"
            },
            {
                image_id: "0185be9ae",
                image_url: "https://cdn.pixabay.com/photo/2015/06/25/17/22/smart-watch-821559__340.jpg",
                image_source_url: "https://pixabay.com/zh/photos/%E6%99%BA%E8%83%BD%E6%89%8B%E8%A1%A8-%E8%8B%B9%E6%9E%9C-%E6%8A%80%E6%9C%AF-%E9%A3%8E%E6%A0%BC-821559/"
            },
            {
                image_id: "019705cd5",
                image_url: "https://cdn.pixabay.com/photo/2018/04/03/08/01/branch-3286202__340.jpg",
                image_source_url: "https://pixabay.com/zh/photos/%E5%88%86%E6%94%AF-%E6%A0%91-%E8%8A%B1-%E5%AD%A3%E8%8A%82-%E6%96%B0%E9%B2%9C-3286202/"
            }
        ]
    },
    similar_result: [ ]
}
```

2. When search keyword is not in database, this is the API after web crawing.
```
{
    search_result: {
        note: "Search from internet.",
        tag: "orange",
        data: [
            {
                image_id: "GAM-7l4QzmI",
                image_url: "https://images.unsplash.com/photo-1530982011887-3cc11cc85693?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=400&fit=max&ixid=eyJhcHBfaWQiOjEyMDd9",
                image_source_url: "https://unsplash.com/photos/GAM-7l4QzmI",
                tag: "orange",
                provider: "unsplash"
            },
            {
                image_id: "zxbNbuncq1g",
                image_url: "https://images.unsplash.com/photo-1492760864391-753aaae87234?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=400&fit=max&ixid=eyJhcHBfaWQiOjEyMDd9",
                image_source_url: "https://unsplash.com/photos/zxbNbuncq1g",
                tag: "orange",
                provider: "unsplash"
            },
            {
                image_id: "Hyu76loQLdk",
                image_url: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=400&fit=max&ixid=eyJhcHBfaWQiOjEyMDd9",
                image_source_url: "https://unsplash.com/photos/Hyu76loQLdk",
                tag: "orange",
                provider: "unsplash"
            },
            {
                image_id: "nibgG33H0F8",
                image_url: "https://images.unsplash.com/photo-1547514701-42782101795e?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=400&fit=max&ixid=eyJhcHBfaWQiOjEyMDd9",
                image_source_url: "https://unsplash.com/photos/nibgG33H0F8",
                tag: "orange",
                provider: "unsplash"
            }
        ],
        origin_keyword: "橘子"
    }
}

```
3. When there isn't any picture found after web crawing.
```
{
    search_result: {
        note: "Search from internet.",
        tag: "sdergwetrthertyh1111",
        data: [ ],
        origin_keyword: "sdergwetrthertyh1111"
    }
}
```


* Error Response: 4XX

|Field         | Type    |Description | 
|:------------:|:-------:|:----------:|
|status        | Number  |Required    | 

* Error Response Example:
```
{
    status: 404
}
```










