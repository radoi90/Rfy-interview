var db = openDatabase('mydb', '1.0', 'Test DB', 1 * 1024 * 1024 * 1024 * 1024 * 1024);
var msg;
db.transaction(function (tx) {
  tx.executeSql('CREATE TABLE IF NOT EXISTS FLATS (id unique, name, beds, lat, long)');
  tx.executeSql('INSERT INTO FLATS (id, name, beds, lat, long) VALUES (1, "Sizeable house", 2, 51.501000, -0.142000)');
  tx.executeSql('INSERT INTO FLATS (id, name, beds, lat, long) VALUES (2, "Trendy flat", 2, 51.501000, -0.142000)');
  tx.executeSql('INSERT INTO FLATS (id, name, beds, lat, long) VALUES (3, "Flat with stunning view", 2, 51.501000, -0.142000)');
  tx.executeSql('INSERT INTO FLATS (id, name, beds, lat, long) VALUES (4, "Unique flat", 1, 51.501000, -0.142000)');
  tx.executeSql('INSERT INTO FLATS (id, name, beds, lat, long) VALUES (5, "Isolated house", 1, 51.501000, -0.142000)');
  //msg = '<p>Log message created and row inserted.</p>';
  //document.querySelector('.span9').innerHTML =  msg;
});

db.transaction(function (tx) {
  tx.executeSql('SELECT * FROM FLATS', [], function (tx, results) {
   var len = results.rows.length, i;
   msg = "<p>Found " + len + " similar flats</p>";
   document.querySelector('.span9').innerHTML +=  msg;
   for (i = 0; i < len; i++){
     msg = "<p><b>" + results.rows.item(i).name + "</b></p>";
     document.querySelector('.span9').innerHTML +=  msg;
   }
 }, null);
});