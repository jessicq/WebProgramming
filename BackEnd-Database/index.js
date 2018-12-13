//load the filesystem core nodejs package so we can read and write to the FS

const fs = require('fs');
//load in the express and express-session packages
const express = require('express')
const session = require('express-session')

//nodejs package I installed for hashing
const crypto = require('crypto')

//get the bodyparser middleware package
const bodyparser = require('body-parser')

//call express to get an app object, to be used like in php/slim
const app = express()

//for strength check
const zxcvbn = require('zxcvbn')

//setup the port we want to use
const port = 3000
//setup the filepath to read and write DB to
const dbFilePath = 'db/database.json'

//lets load our database into memory
let db;
try{
	let rawdata = fs.readFileSync(dbFilePath);  
	db = JSON.parse(rawdata);
}catch (e){
	//cant read file, make a blank db to use
	db = {};
}
console.log("DB",JSON.stringify(db));

//define some helper functions
let writeDB = () => {
	let str = JSON.stringify(db);
	//using sync so we can be sure its written to disk when the function ends
	fs.writeFileSync(dbFilePath, str);
}
let getUser = (username) =>{
	if(db[username]){
		return db[username];
	}
	return false;
}
let saveUser = (userObj) =>{
	let username = userObj.username;
	if(db[username]){
		return false;
	}
	db[username] = userObj;
	writeDB();
	return true;
}
let authUser = (username, password) => {
	if(db[username].password === password){
		return true;
	}
	return false;
}

let strengthLables = [
	"Very Weak",
	"Weak",
	"Fair",
	"Strong",
	"Very Strong"
];

//setup session
//its always on, no need to session_start
app.use(session({
	secret: 'keyboard cat',
	resave: false,
	saveUninitialized: true
}))

// to support URL-encoded bodies like what our forms will Post us
app.use(bodyparser.urlencoded({extended: true})); 

//register a listener for GET requests to / and return 'Hello World' as our response
app.get('/', (req, res) => {
	return res.send('Hello World!')
})

let sha256 = (password, salt) => {
	let hash = crypto.createHmac('sha256', salt);
	hash.update(password);
	let value = hash.digest('hex');
	
	return value; 
	//{
		//salt:salt,
		//passwordHash:value
	//}; 
};

app.get('/users/:username', (req,res)=>{
	console.log("get /users/:username");	
	
	//given a username, return a status 200 if it exists
	if(getUser(req.params.username)) {
		return res.status(200).send(JSON.stringify({username: req.params.username}));
	}
	else return res.status(404).send('user does not exist');
});

app.post('/users', (req,res)=>{
	console.log("post /users")
	//further validates the username and name that they only contain letters, numbers, and spaces
	
	let uName = req.body.username;
	let aName = req.body.name;
	let pword = req.body.password;
	let pass = zxcvbn(pword, []);
	let strength = pass.score;

	//validate that username, name, and password are longer than 3 and shorter than 50 letters
	if(uName.length <= 3) {
		return res.redirect(302, 'registration.html#' + encodeURIComponent('Username is too short.'));
	}
	if(uName.length >= 50) {
		return res.redirect(302, 'registration.html#' + encodeURIComponent('Username is too long.'));
	}

	if(aName.length <= 3) {
		return res.redirect(302, 'registration.html#' + encodeURIComponent('Name is too short.'));
	}
	if(aName.length >= 50) {
		return res.redirect(302, 'registration.html#' + encodeURIComponent('Name is too long.'));
	}

	if(pword.length <= 3) {
		return res.redirect(302, 'registration.html#' + encodeURIComponent('Password is too short.'));
	}
	if(pword.length >= 50) {
		return res.redirect(302, 'registration.html#' + encodeURIComponent('Password is too long.'));
	}
	if(strength < 3) {
		return res.redirect(302, 'registration.html#' + encodeURIComponent('Password is not strong enough.'));
	}

	//further validates the username and name only contain letters, numbers, and spaces
	let nameCheck = new RegExp(aName);
	let userCheck = new RegExp(uName);
	let checker =  new RegExp(/^[0-91-zA-Z_\s]+$/);
	
	if(checker.test(userCheck)) {
		return res.redirect(302, 'registration.html#' + encodeURIComponent('Username can only be letters, spaces, and numbers.'));
	}

	if(checker.test(nameCheck)) {
		return res.redirect(302, 'registration.html#' + endcodeURIComponent('Name can only be letters, spaces, and numbers.'));
	}

	//salt = today's date
	let saltygoodness = JSON.stringify(new Date());

	//hashing the salt with the resulting hash NOT the password
	let passwordData = sha256(pword, saltygoodness);

	let user = {
		username : req.body.username,
		salty : saltygoodness,
		pData : passwordData,
		name : req.body.name,
	};

	saveUser(user);
	return res.redirect(302, 'login.html');	//success
});

app.post('/auth',(req,res)=>{
	console.log('post /auth')
	//given a username and password - validate that the username exists
	if(getUser(req.body.username)) {
		let user = getUser(req.body.username); //getting username
		let passw = req.body.password;
		let newData = sha256(passw, user.salty);

		//compare resulting hash to the stored hash
		if(newData === user.pData) {
			//saving user's name into the session
			req.session.name = user.name;

			return res.status(302).redirect('index.html'); //success
		}
		else {
			let string = encodeURIComponent('Login failed. Try again.');
			return res.status(302).redirect('login.html#' + string);
 		}
	}
	else {
		let string = encodeURIComponent('Login failed. Try again.');
		return res.status(302).redirect('login.html#' + string);
	}
})

app.get('/index.html',(req,res)=>{
	let hello = '';
	if(req.session && req.session.name){
		hello = "Hi "+req.session.name+"!"
	}
	let page = `
	<!DOCTYPE html>
	<title>Project 3</title>
	<h1>Project 3</h1>
	<section>
		<p>
		${hello}
		Go <a href="login.html">here to login</a> or <a href="registration.html">here to register</a>.
		</p>
	</section>`
	res.send(page)
})

//we're telling express to try to match file in our static directory.
//so if a request comes in for /registration.html
//it will first look in try to match one of our above defined routes
//and if it doesnt match a route it will look for proj4/static/registration.html
//if this app.use line were at the top, then our files in static would take precedence
app.use(express.static('static'))

//done with startup and registering callbacks
//all we have left to do is listen on the port 
//and if we were able to grab the port
//run our callback that console logs the achievement
app.listen(port, () => console.log(`Project 4 listening on port ${port}!`))
