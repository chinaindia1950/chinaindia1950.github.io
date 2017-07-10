<?php 

#faceboock
$facebook_app_id      = "FACEBOOK-APP-ID";
$facebook_app_secret  = "FACEBOOK-APP-SECRET";


#g+
$gplus_api_key   = "GOOGLE-PLUS-API-KEY";

#youtube
$youtube_api_key =  "GOOGLE-PLUS-API-KEY";

#vimeo
$viemo_access_token = "VIMEO-ACCESS-TOKEN";
# twitter
$twitter_consumer_key = "TWITTER-CONSUMER-KEY";
$twitter_secret_key   = "TWITTER-SECRET-KEY"; 

#domain for CORSE
$csrf_protection = false;
$allowed_host = "localhost";


#cache
$use_cache = false;
$cache_time_seconds = 60 * 60 * 3;

$config_cache = array(
    "storage"   => "files",
    "path"      =>  getcwd()."/cache",  // path to cache folder, leave it blank for auto detect
    "htaccess"      => true, // create .htaccess to protect cache folder
);     
?>