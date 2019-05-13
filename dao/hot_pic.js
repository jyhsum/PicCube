const mysql = require('../util/mysqlcon.js');

let get = function(){
    return new Promise(function(resolve, reject){
        const query_hot = 'SELECT * , count(A.`image_id`) AS likes FROM `image_like` AS A INNER JOIN `image_data` AS B ON A.`image_id` = B.`image_id` GROUP BY A.`image_id` ORDER BY likes DESC limit 10;';
        mysql.pool.getConnection(function(error, connection) {
            console.log('route:hot_image ,connected as id ' + connection.threadId);
            if (error) {
                console.log(error);
                reject({error: 'Error in connection database.'});
            }
            connection.beginTransaction(function(error) {
                if (error) {
                    connection.rollback();
                    connection.release();
                }
                connection.query(query_hot, function(error, result, _fields) {
                    if (error) {
                        console.log(error);
                        connection.release();
                    }
                    else {
                        connection.commit(function(error) {
                            if (error) {
                                connection.release();  
                                reject({error: 'Error in connection database.'});
                                return mysql.con.rollback(function() {
                                    throw error;
                                });   
                                    
                            }
                            else{
                                connection.release();
                                return resolve(result); 
                            }
                        });
                    }
                });
            });
        });
    });
}



module.exports={get};