const mysql = require('../util/mysqlcon.js');


let add_like_image = function(insert_image_like,like_list){
    return new Promise(function(resolve, reject){
        mysql.pool.getConnection(function(error, connection) {
            if (error) {
                console.log(error);
                connection.release();
                reject({error: 'Error in connection database.'});
            }
            connection.beginTransaction(function(error) {
                if (error) {
                    connection.rollback();
                    connection.release();
                    reject({error: 'Error in connection database.'});
                }
                connection.query(insert_image_like, [like_list], function(error, _result, _fields) {
                    if (error) {
                        console.log(error);
                        connection.release();
                        reject({error: 'Error in insert like image.'});
                    }
                    connection.commit(function(error) {
                        if (error) {
                            connection.release(); 
                            reject({error: 'Error in commit.'});
                            return mysql.con.rollback(function() {
                                throw error;
                            });  
                        }
                        console.log('Added like_list success:'+like_list);
                        resolve({status:200});
                        connection.release(); 
                    }); 
                });
            });
        });
    })
};

let delete_like_image = function(delete_image_like,unlike_list){
    return new Promise(function(resolve, reject){
        mysql.pool.getConnection(function(error, connection) {
            if (error) {
                console.log(error);
                connection.release();
                reject({error: 'Error in connection database.'});
            }
            connection.beginTransaction(function(error) {
                if (error) {
                    connection.rollback();
                    connection.release(); 
                    reject({error: 'Error in connection database.'});
                }
                connection.query(delete_image_like, [unlike_list], function(error, _query_result, _fields) {
                    if (error) {
                        console.log(error);
                        connection.release();
                        reject({error: 'Error in delete like image.'});
                    }
                    else {
                        connection.commit(function(error) {
                            if (error) {
                                connection.release(); 
                                reject({error: 'Error in commit change.'});
                                return mysql.con.rollback(function() {
                                    throw error;
                                });                                 
                            }
                            console.log('Delete unlike_list success:'+unlike_list);
                            resolve({status:200});
                            connection.release(); 
                        });
                    }
                });
            }); 
        });
    });
};








module.exports={add_like_image , delete_like_image};