const mysql = require('../util/mysqlcon.js');
const insert_tag_data = 'insert into tag(`tag_name`)VALUES (?)';
const sql_image_data = 'insert into image_data(`image_source_url`,`image_url`,`provider`, `tag`,`image_id`)VALUES  ?';

let insert_image = function(image_insert_data){
    return new Promise(function(resolve, reject){
        if (image_insert_data.length>0) {
            console.log('start to insert data');
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
                        reject({error: 'Error to begin transaction.'});
                    }
                    connection.query(sql_image_data, [image_insert_data], function(error, _image_results, _fields) {
                        if (error) {
                            console.log(error);
                            reject({error: 'Add image_data Error'});
                            connection.release();
                        } else {
                            connection.commit(function(error) {
                                if (error) {
                                    connection.release();
                                    reject({error: 'Database Query Error'});
                                    return connection.rollback(function() {
                                        throw error;
                                    });
                                } else {
                                    resolve('Insert data successed!');
                                    connection.release();
                                }
                            });
                        }
                    });
                });
            });
        }
    });
};


let insert_tag = function(type){
    return new Promise(function(resolve, reject){
        mysql.pool.getConnection(function(error, connection) {
            if (error) {
                console.log(error);
                console.log({error: 'Error in connection database.'});
            }
            connection.beginTransaction(function(error) {
            if (error) {
                connection.rollback();
                connection.release();
                console.log({error: 'Error to begin transaction.'});
            }
                connection.query(insert_tag_data, type, function(error, _results, _fields) {
                    if (error) {
                        console.log(error);
                        console.log({error: 'Add tag_data Error'});
                        connection.release();
                    } else {
                        connection.commit(function(error) {
                            if (error) {
                                connection.release();
                                console.log({error: 'Database Query Error'});
                                return mysql.con.rollback(function() {
                                    throw error;
                            });
                            } else {
                                console.log('Insert tag_data successed!');
                                connection.release();
                            }
                        });
                    }
                });
            });
        });
    });
};


module.exports={insert_image , insert_tag};