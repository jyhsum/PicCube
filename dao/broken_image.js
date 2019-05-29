const mysql = require('../config/mysqlcon.js');
const insert_broken_id = 'INSERT INTO broken_image(`image_id`)VALUES ?';
const delete_image_data = 'DELETE FROM image_data WHERE (`image_id`) IN (?)';
const delete_image_like_query = 'DELETE FROM image_like WHERE (`image_id`) IN (?)';

let save_broken_id = function(insert_id_list) {
  return new Promise(function(resolve, reject){
    mysql.pool.getConnection(function(error, connection) {
      if (error) {
        console.log(error);
        reject({error: 'Error in connection database.'});
        connection.release();
      }
      connection.beginTransaction(function(error) {
        if (error) {
          connection.rollback();
          reject({error: 'Error in beginTransaction.'});
          connection.release();
        }
        connection.query(insert_broken_id, [insert_id_list], function(error, _save_broken_id_result, _fields) {
          if (error) {
            console.log(error);
            connection.release();
            reject({error: 'Error in insert_broken_id.'});
          }
          connection.commit(function(error) {
            if (error) {
              connection.release();
              reject({error: 'Error in commit.'});
              return mysql.con.rollback(function() {
                throw error;
              });
            }            
            connection.release();
            resolve({status:200});
          });
        });
      });
    });
  });
};


let delete_broken_image = function(delete_id_list) {
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
          reject({error: 'Error in beginTransaction.'});
        }
        connection.query(delete_image_data, [delete_id_list], function(error, _delete_image_data_result, _fields) {
          if (error) {
            console.log(error);
            connection.release();
            reject({error: 'Error in delete_image_data.'});
            return connection.rollback(function() {
              throw error;
            });
          }  
          connection.commit(function(error) {
            if (error) {
              connection.release();
              reject({error: 'Error in commit.'});
              return connection.rollback(function() {
                throw error;
              });
            }
            console.log("delete broken image data successed!");
            connection.release();
            resolve({status:200});
          });
        });
      });
    });
  });
}

let delete_image_like = function(delete_id_list) {
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
          reject({error: 'Error in beginTransaction.'});
        }
        connection.query(delete_image_like_query, [delete_id_list], function(error, _delete_image_like_result, _fields) {
          if (error) {
            console.log(error);
            connection.release();
            reject({error: 'Error in delete_image_like_query.'});
          }  
          connection.commit(function(error) {
            if (error) {
              connection.release();
              reject({error: 'Error in commit.'});
              return mysql.con.rollback(function() {
                throw error;
              });
            }
            console.log("delete broken image like successed!")
            connection.release();
            resolve({status:200});
          });
        });
      });
    });
  });
}




module.exports={save_broken_id,delete_broken_image,delete_image_like};