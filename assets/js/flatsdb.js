var websql = {};

//open the database, name the table and the columns
var sqlsupport = !!window.openDatabase;
if(sqlsupport){ 
    websql.livedb = openDatabase('flatDB', '1.0', 'flat database', 2 * 1024 * 1024 * 1024 * 1024 * 1024);
    websql.tables = 'FLATS ';
    websql.dbcols = ['flat_name', 'no_beds', 'latitude', 'longitude'];
}

//check if we support local storage, if so, create a new localStorage object
websql.localstorage = function(){
    try {
        return 'localStorage' in window && window['localStorage'] !== null;
    } catch(e) {
        return false;
    }
};


//A wrapper method for our local DB related actions
websql.dbtransaction = function(action){
    var params = [],
        callback = null,	//called after transaction
        bonusAction = null,	//completes the query
        actionBuffer = [],	//the query
        cols = (action == 'create') ? '('+'flat_id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, '+websql.dbcols.join(', ')+')' //columns created/queried
                                    : '('+websql.dbcols.join(', ')+')',
        args = Array.prototype.slice.call(arguments),
        placeholders = function(){
            var arr = [];
            for(var i=0; i<websql.dbcols.length; arr.push('?'), i++);
            return '('+arr.join(', ')+')';
        };	//adds [?,?,..?] to be substituted with the actual values
        
    //shift the first elem off, as it is already set as our action.
    args.shift();
    
    //lets evaluate our args and set params, bonusAction and callback appropriately
    for(var i=0; i<args.length; i++){
        if(typeof args[i] == 'object'){
            if(args[i].constructor == Array){ params = args[i]; }
        }
        if(typeof args[i] == 'string') { bonusAction = args[i]; }
        if(typeof args[i] == 'function') { callback = args[i]; }
    }
    
    websql.livedb.transaction(function(tx){
        switch(action){
            case 'create':
                actionBuffer.push('CREATE TABLE IF NOT EXISTS ');
                actionBuffer.push(websql.tables);	//table name
                actionBuffer.push(cols);			//table columns
                break;
            case 'insert':
                actionBuffer.push('INSERT INTO ');
                actionBuffer.push(websql.tables);	//table name
                actionBuffer.push(cols);			//table columns
                actionBuffer.push(' VALUES ');
                actionBuffer.push(placeholders());	//actual values
                break;
            case 'update':
                actionBuffer.push('UPDATE ');
                actionBuffer.push(websql.tables);	//table name
                actionBuffer.push('SET ');
                break;
            case 'select':
                actionBuffer.push('SELECT * FROM ');
                actionBuffer.push(websql.tables);
                break;
            case 'drop':
                actionBuffer.push('DROP TABLE IF EXISTS ');
                actionBuffer.push(websql.tables);	//table name
                break;
        }
        
        try{
            //a final chance to modify the query
            //comes in handy for WHERE clauses,
            //is neccessary for UPDATEs
            if(bonusAction !== null) { actionBuffer.push(bonusAction.trim()+' ');}
			
			//do the query
            tx.executeSql(actionBuffer.join(' '), params, callback);
			if (action == 'create') {
				//add index on coordinates to speed up the search query for nearby properties
				tx.executeSql('CREATE INDEX geo_coord ON FLATS (latitude, longitude)');
			}
        }
        catch(e){
            alert('Local database '+action+' failed');
        }
        
    });
    
};

//resets all the form elements in both forms
websql.form_reset = function(){
    $("input#name").val('');
	$("input#i_beds").val('');
	$("input#i_lat").val('');
	$("input#i_long").val('');
	$("input#s_beds").val('');
	$("input#s_lat").val('');
	$("input#s_long").val('');
};

//convert degrees to radians
toRad = function(degrees) {
	return (degrees * Math.PI)/180;
}

//convert radians to degrees
toDeg = function(radians) {
	return (radians * 180)/Math.PI;
}

//called in document.ready and starts the websql ball rolling
websql.init = function(){
    //Similar to other checks for 'Safari', this conditional is unecessary if this is only used on iPads/Safari 
    if(websql.livedb && websql.localstorage()){
        //Bind everything
        websql.binds();
        
        //reset the form
        websql.form_reset();
        
		//start fresh
		websql.dbtransaction('drop', function(){
		        websql.dbtransaction('create');
		});
		
        // ensure our tables exist
        websql.dbtransaction('create');
        
		//populate with the examples
		websql.dbtransaction('insert', ['Buckingham Palace', 2, toRad(51.501000), toRad(-0.142000)]);
		websql.dbtransaction('insert', ["Trellick Tower", 2, toRad(51.523778), toRad(-0.205500)]);
		websql.dbtransaction('insert', ["The Shard", 2, toRad(51.504444), toRad(-0.086667)]);
		websql.dbtransaction('insert', ["ArcelorMittal Orbit", 1, toRad(51.538333), toRad(-0.013333)]);
		websql.dbtransaction('insert', ["Cornwall Lighthouse", 1, toRad(50.066944), toRad(-5.746944)]);
		
        //debug
        //websql.displayFlats();

    } else {
        alert('Either Web SQL Databases or Local Storage are not supported on this device. Please view this page in Safari, Chrome or Opera.');
    }
};

websql.binds = function(){
    $("#websql-insert-flats").submit(websql.insertSubmitHandler);
    $("#websql-select-flats").submit(websql.selectSubmitHandler);
};

//hide feedback message and results
websql.hide = function(){
    $('#results').fadeOut(function(){ $(this).addClass('hidden'); });
	$('#result-message').fadeOut(function(){ $(this).addClass('hidden'); });
};

//show any hidden classes
websql.show = function(){
    $('.hidden').fadeIn(function(){ $(this).removeClass('hidden'); });
};

//hide just the results
websql.hideResults = function(){
	 $('#results').fadeOut(function(){ $(this).addClass('hidden'); });
};

//show just the feedback message
websql.showMessage = function(){
	$('#result-message').fadeIn(function(){ $(this).removeClass('hidden'); });
};

//insert a property
websql.insertSubmitHandler = function(e){ 
	//retrieve input from form   
    var flat_name = $("#name").val().trim(),
		no_beds = parseInt($("#i_beds").val().trim()),
		latitude = toRad(parseFloat($("#i_lat").val().trim())),
		longitude = toRad(parseFloat($("#i_long").val().trim())),
        params = [
                    flat_name,              //name
					no_beds,				//number of beds
					latitude,				//latitude
					longitude				//longitude
                ];
	//check all the fields were completed correctly
    if(flat_name !== '' && !(isNaN(no_beds)) && (no_beds > 0) && !(isNaN(latitude)) && !(isNaN(longitude))
		&& (toRad(-90)<=latitude) && (latitude<=toRad(90)) && (toRad(-180)<=longitude) && (longitude<=toRad(180))){
		//insert property into database
		websql.dbtransaction('insert', params, function(){
				//debug
                //websql.displayFlats();
                websql.form_reset();	//reset form
				websql.hideResults();	//landlord user, hide tenant results
				websql.showMessage();	//give feedback:
				$('#result-message').html('<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>'+
				'<strong>Success!</strong> Your property "'+ flat_name+'" was added to the database.</div>'); 
				
         });
    } 
	//if fields incorrect send feedback to user
	else {
		websql.hideResults(); //landlord user hide tenant results
		websql.showMessage(); //give feedback:
		$('#result-message').html('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>'+
		'<strong>Error! </strong>All fields marked * are mandatory. The number of bedrooms has to be a positive integer,'+
		' latitude must be between 0 and +/-90 and longitude between 0 and +/-180</div>');
    }

    return false;
};

//search for (similar) properties
websql.selectSubmitHandler = function(e){
	//retrieve input from form
    var no_beds = parseInt($("#s_beds").val().trim()),
		latitude = toRad(parseFloat($("#s_lat").val().trim())),
		longitude = toRad(parseFloat($("#s_long").val().trim()));
	//check all the fields were completed correctly	
    if(!(isNaN(no_beds)) && (no_beds > 0) && !(isNaN(latitude)) && !(isNaN(longitude)) 
		&& (toRad(-90)<=latitude) && (latitude<=toRad(90)) && (toRad(-180)<=longitude) && (longitude<=toRad(180))){
		/*properties that are 20km from the search point lie inside the "great circle" on the sphere(Earth)
		with radius 20km and centered at the search point. This circle is included in square with side 2*20km
		with the intersection of it's diagonals at the seach point. This is a linear boundary so we can use the index on
		the coordinates to get the properties in that square. Then we will sort the results for just
		those that are in the circle with radius 20km.*/
		var r = 20/6371, 				//angular radius (Earth radius = 6371km)
			latMin = latitude - r,		//square boundaries, latitude
			latMax = latitude + r;
			deltaLon = Math.asin(Math.sin(r)/Math.cos(latitude)),
			lonMin = longitude - deltaLon, //square boundaries, longitude
			lonMax = longitude + deltaLon;
			
			//edge case at the poles
			if ((lonMin < -Math.PI) || (lonMin > Math.PI) || (lonMax < -Math.PI) || (lonMax > Math.PI)) {
				lonMin = -Math.PI;
				lonMax = Math.PI;
			}
			
			//the WHERE clause: 1. entries within the square
			var subQ1 = '(latitude >= '+latMin+' AND latitude <= '+latMax+') AND (longitude >= '+lonMin+' AND longitude <= '+lonMax+')';
			//2. entries with requiered number of beds
			var subQ2 = ' AND (no_beds >='+no_beds+')';	
			
			//make the query, pass results to be sorted and displayed
	        websql.dbtransaction('select', ' WHERE '+subQ1+subQ2, function(tx,res){
	            websql.displayResult(res,latitude,longitude);
                websql.form_reset();
	        });
		
    }
	//if fields incorrect send feedback to the user 
	else {
		websql.hideResults(); //user wanted new results, hide old
		websql.showMessage(); //give feedback:
		$('#result-message').html('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>'+
		'<strong>Error! </strong>All fields marked * are mandatory. The number of bedrooms has to be a positive integer,'+
		' latitude must be between 0 and +/-90 and longitude between 0 and +/-180</div>');
    }
    
    return false;
};


//sort and display search results
websql.displayResult = function(res, latitude, longitude){
	var htmlResult = [],		//the html content to be displayed
		propertiesInRange = [],	//array of properties within the 20km radius and with enough beds
		l = res.rows.length,	//number of querie results
        i;
		
		//filter the results that are not inside the 20km radius
		for(i = 0; i < l; i++) {
			//the great circle distance
			var dist = Math.acos(Math.sin(latitude) * Math.sin(res.rows.item(i).latitude) + 
							Math.cos(latitude) * Math.cos(res.rows.item(i).latitude) * Math.cos(res.rows.item(i).longitude - longitude)) * 6371;
			//add valid results to array
			if (dist <= 20) {
				propertiesInRange.push({
					"name": res.rows.item(i).flat_name,
					"no_beds": res.rows.item(i).no_beds,
					"dist": dist	//distance from search point
				});
			}
		}
		
		l = propertiesInRange.length;
		//sort by distance from search point
		propertiesInRange.sort(function(a,b) {return a.dist - b.dist});
		
		//if there are similar properties display them
        if(l>0){
			for(i = 0; i<l; i++){
				//three properies per row
				if(i % 3 == 0) { htmlResult.push('<div class="row-fluid">'); };
				htmlResult.push('<div class="span4"><h2>'+propertiesInRange[i].name+'</h2>');
				htmlResult.push('<p>Bedrooms: '+ propertiesInRange[i].no_beds+'</p>');
				htmlResult.push('<p>Distance: '+ propertiesInRange[i].dist.toFixed(2)+' km</p>');
				htmlResult.push('<p><a class="btn" href="#">View details &raquo;</a></p></div>');
				if(i % 3 == 2) { htmlResult.push('</div>'); };
			}
			//close last row
			if(i % 3 != 2) { htmlResult.push('</div>'); };
			//put result contents in page
			$('#results').html(htmlResult.join(''));
			//give feedback
            $('#result-message').html('<div class="alert alert-info"><a class="close" data-dismiss="alert">×</a>'+
			'<strong>Sorry! </strong>The property you were looking for is not available. Here are some similar ones nearby:</div>');    
			//show feedback and results
			websql.show();
		}//if the search has no result 
		else {
			websql.hideResults(); //user wanted new results, hide old
			websql.showMessage(); //give feedback:
			$('#result-message').html('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>'+
			'<strong>Oh no! </strong>There are no properties matching your description in that area.</div>');
		}
};

/*Displays all entries, used for debugging
websql.displayFlats = function(){
    websql.dbtransaction('select', function(tx, res){
        var htmlResult = [],
			l = res.rows.length,
            i;

            if(l>0){
                for(i = 0; i<l; i++){
					if(i % 3 == 0) { htmlResult.push('<div class="row-fluid">'); };
					htmlResult.push('<div class="span4"><h2>'+res.rows.item(i).flat_name+'</h2><p>Bedrooms: '+ res.rows.item(i).no_beds+'</p><p><a class="btn" href="#">View details &raquo;</a></p></div>');
					if(i % 3 == 2) { htmlResult.push('</div>'); };
                }
				if(i % 3 != 2) { htmlResult.push('</div>'); };
                $('#results').html(htmlResult.join(''));
                
                websql.show();
            } else {
                websql.hide();
            }

    });
};*/

//initializes the database when the page loads
$(function(){
    websql.init();
});