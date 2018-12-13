<?php
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

require 'vendor/autoload.php';

function getDB(){
	//file path to json file
	$dbpath = 'private/database.json';

	//load it
	$db = file_get_contents($dbpath);

	//if blank, use empty array, else json decode into array
	if($db === "" || $db === false){
		$db = Array();
	}else{
		$db = json_decode($db,true);
	}
	return $db;
}

function writeDB($db){
	//file path to json file
	$dbpath = 'private/database.json';

	//write it
	file_put_contents($dbpath, json_encode($db));
}

function getUser($username){
	$db = getDB();

	//the following error_log command will print to 
	// /var/log/apache2/error.log you can watch it with
	//	sudo tail -f /var/log/apache2/error.log 
	//you'll need to use ctrl+c to exit, it'll stay up forever
	//error_log("Get user $username from ".json_encode($db));

	//check if user exists
	if(array_key_exists($username, $db)){
		return $db[$username];
	}

	return false;
}

function saveUser($user){
	$db = getDB();

	//another way to check for key in array
	if(isset($db[$user['username']])){
		return "User exists";
	}

	//write obj into users array (db array)
	$db[$user['username']] = $user;

	//save to disk
	writeDB($db);

	return true;
}

function authUser($username,$password){
	$db = getDB();
	if(!isset($db[$username])){
		return "No User";
	}
	if($password !== $db[$username]['password']){
		return "No Match";
	}

	return true;
}

//create the slim app
$app = new \Slim\App;

//because of our rewrite rule in .htaccess
//any HTTP request for a path inside of this folder that doesnt match a file or directory
//will instead invoke this file
//Slim can read from apache what the HTTP request was, and will use that info
//like method and path, to call one of these functions

//listen for a GET against anything like /users/<username>
//which is relative to the dir its in, so really probably /proj3/users/<username>
$app->get('/users/{name}', function (Request $request, Response $response, array $args) {
	//slim knows that {name} is a variable and pulls it out of the URL for you
	//its in $args
	error_log('in get user');

	$name = $args['name'];

	//if user doesn't exist, return a 200 === false
	if(getUser($name) === false) {
		return $response->withStatus(404);
	}
	else {
		return $response->withStatus(200);
	}
});

//listen for a POST to /users
$app->post('/users', function (Request $request, Response $response, array $args) {

	//php was built to be able to natively decode HTML <form> variables,
	//since the action was post on the form, not only does slim know to call this function
	//but php knows how to extract the variables and stores them inside $_POST (global variable)
	$user = array(
		'username' => $_POST['username'],
		'password' => $_POST['password'],
		'name' => $_POST['name']
	);

	$result = saveUser($user);

	//the form that posted to this endpoint is waiting for a response
	//unlike when using the axios library, this is a full page load / redirection
	//a 302 would not work inside /users/{name}, because its just JS doing the request, not the
	//browser window

	//if it worked and saved...
	if($result === true){
		return $response->withRedirect('login.html', 302);
	}
	//else user the # to pass an error back to the browser and reload the same page they came from
	return $response->withRedirect('registration.html#'.$result, 302);
});

	//attempt to verify (authenticate) user
		//username and password will be in $_POST from login.html form
		//it worked, save username and name into session memory for later use
		//direct user to index.php
	//else it didnt work, kill the session.
	//and send them back to the login page with a message.
$app->post('/auth', function (Request $request, Response $response, array $args) {
	session_start();

	if(isset ($_SESSION['username'])) {
		header("location: index.php", true);
		//return $response->withRedirect('index.php', 302);
	}

	if (authUser($_POST['username'], $_POST['password']) === true) {
		$_SESSION['username'] = $_POST['username'];

		$user = getUser($_POST['username']);
		$real_name = $user['name'];
		$_SESSION['name'] = $real_name;

		return $response->withRedirect('index.php', 302);
	}
	else {
		session_destroy();
	
		return $response->withRedirect("login.html#".urlencode('Failed.'));
	}
});


$app->run();

?>
