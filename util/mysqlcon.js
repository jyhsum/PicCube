// MySQL Initialization
const mysql=require("mysql");

const pool = mysql.createPool({
    	connectionLimit : 15,
	host:"localhost",
	user:"jyhsum",
	password:"B994020003",
	database:"images_db",
	acquireTimeout: 60000

});


module.exports={
	pool:pool
};





