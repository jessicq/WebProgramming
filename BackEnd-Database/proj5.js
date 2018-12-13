const crypto = require('crypto'); 

//some webserver libs
const express = require('express');
const bodyParser = require('body-parser');
const auth = require('basic-auth');

//promisification
const bluebird = require('bluebird');

//database connector
const redis = require('redis');
//make redis use promises
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);
//create db client
const client = redis.createClient();

//make sure client connects correctly.
client.on("error", function (err) {
    console.log("Error in redis client.on: " + err);
});

//simple function to add a user and their credentials to the DB
const setUser = function(userObj){
	return client.hmsetAsync("user:"+userObj.id, userObj ).then(function(){
		console.log('Successfully created (or overwrote) user '+userObj.id);
	}).catch(function(err){
		console.error("WARNING: errored while attempting to create tester user account");
	});

}

//make sure the test user credentials exist
let userObj = {
	salt: new Date().toString(),
	id: 'teacher'
};
userObj.hash = crypto.createHash('sha256').update('testing'+userObj.salt).digest('base64');
//this is a terrible way to do setUser
//I'm not waiting for the promise to resolve before continuing
//I'm just hoping it finishes before the first request comes in attempting to authenticate
setUser(userObj);


//start setting up webserver
const app = express();

//decode request body using json
app.use(bodyParser.json());

//allow the API to be loaded from an application running on a different host/port
app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
        res.header('Access-Control-Expose-Headers', 'X-Total-Count');
        next();
});

//protect our API
app.use(function(req,res,next){
	switch(req.method){
		case "GET":
		case "POST":
		case "PUT":
		case "DELETE":
			//extract the given credentials from the request
			let creds = auth(req);

			if(!creds) return res.sendStatus(401);

			//look up userObj using creds.name
			client.hgetallAsync("user:"+creds.name).then(
				(userObj)=>{
					//user exists
					
					/* Using creds.pass, userObj.salt, userObj.hash, and crypto to validate
					   whether the creds are valid. if they are valid call next(); */
					let newData = crypto.createHash('sha256').update(creds.pass+userObj.salt).digest('base64'); 	
					if(newData === userObj.hash) {
						next();
					} else res.sendStatus(401); //otherwise call res.sendStatus(401)
					
				},
				(err)=>{
					//user doesnt exist or something
					console.error("in authenticate app.use, hgetall returned error: ",err);
					res.sendStatus(401);
				}
			);
			break;
		default:
			//maybe an options check or something
			next();
			break;
	}
});

//this takes a set of items and filters, sorts and paginates the items.
//it gets its commands from queryArgs and returns a new set of items
//used like
//	listOfStudents = filterSortPaginate('student', req.query, listOfStudents)
let filterSortPaginate = (type, queryArgs, items) =>{
	//console.log(items);
	//console.log("CHECK");
	let keys;

	//create an array of filterable/sortable keys
	if(type == 'student'){
		keys = ['id','name'];
	}else{
		keys = ['id','student_id','type','max','grade'];
	}

	//applied to each item in items
	//returning true keeps item
	let filterer = (item) =>{
		//loop through keys
		for(let i=0;i<keys.length;i++) {
			console.log(keys[i]);
			console.log(queryArgs);
			if((queryArgs[keys[i]] != undefined) && (!item[keys[i]].toLowerCase().includes(queryArgs[keys[i]].toLowerCase()))) return false;

		}
			return true;
	};

	//apply above function
	items = items.filter(filterer);
	
	console.log('items after filter:',items)
	
	//always sort, default to sorting on id
	if(!queryArgs._sort){
		queryArgs._sort = 'id';
	}
	//make sure the column can be sorted
	let direction = 1;
	if(!queryArgs._order){
		queryArgs._order = 'asc';
	}
	if(queryArgs._order.toLowerCase() == 'desc'){
		direction = -1;
	}

	//comparator...given 2 items returns which one is greater
	//used to sort items
	let sorter = (a,b)=>{

		let result;

		//key to compare is in queryArgs._sort
		let key = queryArgs._sort;

		/* if a[key] (lowercased) > b[key] (lowercased) result = 1
		 * if its less than, result = -1,
		 * else result = 0 */
		if(a[key].toLowerCase() > b[key].toLowerCase()) result = 1;
		else if(a[key].toLowerCase() < b[key].toLowerCase()) result = -1;
		else result = 0;

		return result * direction;
		//multiply result by direction and return it
	};

	items.sort(sorter);
	console.log('items after sort:',items)
	//if we need to paginate
	if(queryArgs._start || queryArgs._end || queryArgs._limit){
		//use queryArgs._start, _end, & limit
		//to figure out start and end 
		//then items = items.slice(start,end)

		let _start;
		let _end;

		//starts defaults at 0
		if(!queryArgs._start) {
			_start = 0;
		}
		else {
			_start = queryArgs._start;
		}

		//end defaults to # of items
		if(!queryArgs._end) {
			if(queryArgs._limit) {
				_end = _start + queryArgs._limit;
			}
			else { 
				_end = items.length;
			}
		}
		else {
			_end = queryArgs._end;
		}

		items = items.slice(_start, _end);
	}

	console.log('items after pagination:',items)
	return items;
};

//delete database - THANKS CRAIG!!
app.delete('/db',function(req,res){
        client.flushallAsync().then(function(){
                //make sure the test user credentials exist
                let userObj = {
                        salt: new Date().toString(),
                        id: 'teacher'
                };
                userObj.hash = crypto.createHash('sha256').update('testing'+userObj.salt).digest('base64');
                //this is a terrible way to do setUser
                //I'm not waiting for the promise to resolve before continuing
                //I'm just hoping it finishes before the first request comes in attempting to authenticate
                setUser(userObj).then(()=>{
                        res.sendStatus(200);
                });
        }).catch(function(err){
                res.status(500).json({error: err});
        });
});

/* add students
 * accepts a JSON request body
 */
app.post('/students', function(req, res) {
	//check to see if username key, no name key, or no body at all - returns 400
	if(typeof(req.body.name) == "undefined"){	//changed from "===" to "=="
		return res.sendStatus(400);
	}
	if(typeof(req.body.id) == "undefined"){		//changed from "===" to "=="
		return res.sendStatus(400);
	}

	let studentID = req.body.id;
	let studentName = req.body.name;

	client.sismemberAsync("students", studentID).then(function(args){
		if(args == 1){
			return res.sendStatus(400);
		}
		client.saddAsync("students", studentID).then(function(){
			let studentObj = {"_ref":"/students/"+studentID, "id": studentID, "name": studentName};
			console.log(JSON.stringify(studentObj));

			client.hmsetAsync('student:'+studentID, studentObj).then(function(){
				return res.status(200).json(studentObj);
			})
		})
	})
});

/* delete students
 * no request body required
 */
app.delete('/students/:id', function(req, res) { //is this supposed to be id?
	//returns response body containing the id of the item
	client.scardAsync("students").then(function(args){
		if(args == 0) {
			return res.sendStatus(404);
		}
		else{
			let studentID = req.params.id;
			client.delAsync("student:"+studentID).then(function(arg2){
				console.log('deleted student:'+studentID);
				if(arg2 == 1){
					client.sremAsync("students", studentID).then(function(arg){
						console.log('deleted students');
						if(arg == 1){
							let returnObj = {"id":+studentID};
							return res.status(200).json(returnObj);
						}
					})
				}
			})
		}
	})

});

/* modifies student
 * accepts a JSON request body 
 */
app.put('/students/:id', function(req, res) {
	//if try to change id, or no request body, 400
	
	if(typeof(req.body) === "undefined"){
		return res.sendStatus(400);
	}	
	if(typeof(req.body.id) != "undefined") {
		return res.sendStatus(400);
	}
	if(typeof(req.body.name) === "undefined"){
		return res.sendStatus(400);
	}

	let newName = req.body.name;
	let studentID = req.params.id;

	client.hsetAsync("student:"+studentID, "name", newName).then(function(){
		return res.sendStatus(200);
	})

});

/* get student
 * no queries param here
 */
app.get('/students/:username', function(req, res) {
	
	let username = req.params.username;
	client.sismemberAsync('students',username).then(function(exists) {
		if(exists) {
			//returns with content of JSON user
			client.hgetallAsync(`student:${username}`).then(function(newStudent) {
				return res.status(200).json(newStudent);
			});
		}
		else {
			return res.status(404).json({"Status Code:" : "404 - Student does not exist."}); //user doesn't exist
		}
	});
});

/* get all students
 * returns a JSON array
 * supports filtering and sorting on id or name
 * supports pagination 
 */
app.get('/students', function(req, res) {
	 client.smembersAsync('students').then(function(students) {
		let allStudents = [];
		let studentData = [];
		let currentID = null;
		let studentAmt = students.length;

		for(let i=0; i<students.length; i++) {
			currentID = students[i];
			allStudents.push(client.hgetallAsync(`student:${currentID}`).then(userObj => {
				console.log(JSON.stringify(userObj));
				studentData.push(userObj);
			}));
		}

                res.set('X-Total-Count', studentAmt);
		Promise.all(allStudents).then(function() {

			studentData = filterSortPaginate('student', req.query, studentData); 
			return res.status(200).json(studentData);
		});
	});
});

/* add grades
 * id for grades should be a counter stored in redis, NOT in nodejs
 * should accept a JSON request body
 */
app.post('/grades', function(req, res) {

	let gradetype = req.body.type;
	let studentID = req.body.student_id;
	let score = req.body.grade;
	let maximum = req.body.max;

	if(!gradetype || !studentID || !score || !maximum) {
		return res.sendStatus(400);
	}

	client.incrAsync("grades").then(function(id){
		let gradeID = id;
		let gradeObj = {"_ref":"/grades/"+gradeID, "id": gradeID.toString(), "type": gradetype, "student_id": studentID, "grade": score, "max": maximum};
		
		console.log(gradeObj);
		client.hmsetAsync("grade:"+gradeID, gradeObj).then(function(){
			let returnObj = {"_ref":"/grades/"+gradeID, "id": ""+gradeID};
			return res.status(200).json(gradeObj);
		})
	})
});

/* get grade */
app.get('/grades/:id', function(req, res) {
	let gradeID = req.params.id;
	client.existsAsync("grade:"+gradeID).then(function(args){
		if(args == 0){
			return res.sendStatus(404);
		}

		client.hmgetAsync("grade:"+gradeID, "type", "student_id", "grade", "max", "id").then(function(gradeObj){
			let returnObj = {"student_id":gradeObj[1], "type":gradeObj[0], "max":gradeObj[3], "grade":gradeObj[2], "_ref":"/grades/"+gradeObj[4], "id":gradeObj[4]};

			return res.status(200).json(returnObj);
		})
	})

});

/* modifies grade
 * should expect a hashed array of values to change
 * accepts changes for max, grade, type and student_id 
 */
app.put('/grades/:id', function(req, res) {
	if(typeof(req.params.id) === "undefined"){
		return res.sendStatus(404);
	}
	if(typeof(req.body.max) === 'undefined' && typeof(req.body.grade) === 'undefined' && typeof(req.body.type) === 'undefined' && typeof(req.body.student_id) === 'undefined'){
		return res.sendStatus(400);
	}

	let gradeID = req.params.id;
	if(typeof(req.body.max) !== "undefined") {
		let gradeMax = req.body.max;
		client.hsetAsync("grade:"+gradeID, "max", gradeMax).then()
	}
	if(typeof(req.body.grade) !== "undefined") {
		let grade = req.body.grade;
		client.hsetAsync("grade:"+gradeID, "grade", grade).then()
	}
	if(typeof(req.body.type) !== "undefined") {
		let gradeType = req.body.type;
		client.hsetAsync("grade:"+gradeID, "type", gradeType).then()
	}
	if(typeof(req.body.student_id) !== "undefined") {
		let studentID = req.body.student_id;
		client.hsetAsync("grade:"+gradeID, "student_id", studentID).then()
	}

	return res.sendStatus(200);
});	

/* delete grade */
app.delete('/grades/:id', function(req, res) {
	let gradeID = req.params.id;

	client.existsAsync("grade:"+gradeID).then(function(args){
		if(args == 0) {
			return res.sendStatus(404);
		}

		client.delAsync("grade:"+gradeID).then(function(){
			return res.sendStatus(200);
		})
	})
});

/* returns a list of all grades
 * supports sorting and filterable by student_id, type, max and grade
 * supports pagination
 */
app.get('/grades', function(req, res) {
	//if no grades exist, return a 200 with a body of []
	//if grades exist and no GET parameter queries were submitted, return a 200 with a list of all grade objects
	
	client.getAsync('grades').then(function(gradeAmt) {
		let allGrades = [];
		let gradeData = [];
		let currentGradeID = null;

		for(let i=1; i<=gradeAmt; i++) {
			currentGradeID = i;
			allGrades.push(client.hgetallAsync(`grade:${currentGradeID}`).then(gradeObj => {
				if(gradeObj) gradeData.push(gradeObj);
			}));
		}

		Promise.all(allGrades).then(function() {
			res.set('X-Total-Count', gradeData.length);
        		gradeData = filterSortPaginate('grade', req.query, gradeData);
			return res.status(200).json(gradeData);
		});
	});
});


let port = 3000;
app.listen(port, function () {
  console.log('Proj 5 listening on port '+port+'!');
});
