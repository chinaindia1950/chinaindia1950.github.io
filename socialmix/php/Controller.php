<?php
use phpFastCache\CacheManager;
class Controller {

    public static function response($type, $id, $resources, $target) {
        require("./settings.php");
        require_once("./Feed.php");
        
        if ( $csrf_protection  &&  !array_key_exists( 'HTTP_REFERER' , $_SERVER) ){
            Controller::write_response('{"error" : "1" , "message" : "csrf protection" }' , $allowed_host);
            exit(0);
        }

        if ( $csrf_protection && parse_url( $_SERVER['HTTP_REFERER'] , PHP_URL_HOST ) != $allowed_host ){
            Controller::write_response('{"error" : "2" , "message" : "csrf protection" }' , $allowed_host);
            exit(0);
        }


        $cached_response = null;
        if( $use_cache ){
            
            #create cache
            CacheManager::setup($config_cache);
            CacheManager::CachingMethod("phpfastcache");
            try{

                $cache = CacheManager::getInstance();
            } catch (Exception $e) {
                header('HTTP/1.1 500 Cache error');
                Controller::write_response('{"error" : "2" , "message" : "Cache error. Please check cache configuration in your setting file \n'.$e->getMessage().' \nTo disable cache set $use_cache = false;" }' , $allowed_host);
                exit;
            }

            $cache_key = $type."-".$id."-".$resources."-".$target;
            $cached_response = $cache->get($cache_key);
        }

        if($cached_response == null) {
            #1 - create object Feed
            switch ($type) {
                case "facebook":
                    $feed  = new Facebook($id, $facebook_app_id."|".$facebook_app_secret, $resources, $target );
                    break;
                case "gplus":
                    $feed  = new Gplus($id, $gplus_api_key, $resources,  $target);
                    break;
                case "youtube":
                    $feed  = new Youtube($id, $youtube_api_key, $resources,  $target);
                    break;
                case "vimeo":
                    $feed  = new Vimeo($id, $viemo_access_token, $resources,  $target);
                    break;
                case "twitter":
                    $feed  = new Twitter($id, $twitter_secret_key, $twitter_consumer_key, $resources, $target);
                    break;             
                case "rss":
                    $feed = new Rss($id ,"");
            }

            #2 - call get_feed method
            $response = $feed->get_feed();
            
            #3 - insert in cache
            if($use_cache && $response != FALSE){
                $cache->set($cache_key,$response , $cache_time_seconds);
            }
        }else{
            $response = $cached_response;
        }
        
        if($response === FALSE) {
            header('HTTP/1.1 502 Bad Gateway:'.$type." ".$id." unavailable");
            $response = '{"error" : "3" , "message" : "Please check API-KEY in your settings file. Make sure the '.$type.' api key is a valid API-KEY"}';
        }
        Controller::write_response($response , $allowed_host);
    }

    public static function write_response($response , $allowed_host){
        header('Content-Type: application/json');
        header('Access-Control-Allow-Origin: '.$allowed_host);  
        echo $response;
    }

}

?>