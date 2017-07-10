<?php
//error_reporting(E_ALL);
//ini_set('display_errors', 'On');
ini_set('html_errors', 0);
error_reporting(0);

require_once("Controller.php");
require __DIR__ . "/vendor/phpFastCache/phpFastCache.php";

//required params
if ( !isset($_GET["type"]) ||  !isset($_GET["id"])){
		echo "invalid request !!";
		exit;

}

//optional params
if (empty($_GET['resources'])){
	$resources = "default";
}else{
	$resources = $_GET["resources"];
}

if (empty($_GET['target'])){
	$target = "default";
}else{
	$target = $_GET["target"];
}

Controller::response( $_GET["type"], $_GET["id"], $resources, $target );


