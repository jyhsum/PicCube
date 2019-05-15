const mysql = require('../util/mysqlcon.js');

let get = function(){
    return new Promise(function(resolve, reject){
        const query_hot = 'SELECT `image_source_url`,`image_url` , A.`image_id` ,count(A.`image_id`) AS likes FROM `image_like` AS A INNER JOIN `image_data` AS B ON A.`image_id` = B.`image_id` GROUP BY A.`image_id` ORDER BY likes DESC limit 10;';
        mysql.pool.getConnection(function(error, connection) {
            console.log('route:hot_image ,connected as id ' + connection.threadId);
            if (error) {
                console.log(error);
                reject({error: 'Error in connection database.'});
                connection.release();
            }
            connection.query(query_hot, function(error, result, _fields) {
                if (error) {
                    console.log(error);
                    connection.release();
                }
                else {
                    connection.release();
                    return resolve(result);     
                }
            });
        });
    });
}



module.exports={get};