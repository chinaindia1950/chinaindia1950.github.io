<?php
require_once("Utils.php");

class Feed
{
    public $id;
    public $secret;
    public $default_resources = "all";
    public $headers;
    public $target;

    public function __construct($id, $secret, $resources, $target) {
        $this->id = $id;
        $this->secret = $secret;
        $this->target = $target;
        $this->headers = "";
        
        //use default value
        if (strpos($resources, 'default') !== false) {
            $resources = $this->default_resources;
        }
        //avoid duplicate resources like "all,post,events" --> "all"
        if (strpos($resources, 'all') !== false) {
            $resources = "all";
        }
        $this->resources = $resources;
    }

    public function get_feed(){
        $params   = array("#id" => $this->id , "#secret" => $this->secret);
        $endpoint = $this->build_endpoint();
        $url      = strtr($endpoint, $params);
        return Http::get($url, $this->headers);
         
    }

    public function build_endpoint(){
        return $this->endpoint;
    }
    
}
class Rss extends Feed{
    public $endpoint = 'http://ajax.googleapis.com/ajax/services/feed/load?num=20&output=json_xml&v=1.0&q=#id';

}

class Facebook extends Feed{
    public $endpoint = 'https://graph.facebook.com/v2.5/#id?access_token=#secret&fields=id,name,picture,link';
    public $default_resources = "posts";
    public $endpoint_resources = array(
                            "events" => "events.limit(200){id,attending_count,cover,description,end_time,interested_count,maybe_count,name,owner,parent_group,place,start_time,ticket_uri,timezone,type,updated_time,photos{id,images,link,name,picture,place}}",
                            
                            "posts" => "posts{message,story,story_tags,full_picture,link,attachments{description,media,subattachments.limit(100),type,url,target{id,url}},created_time,type,shares,likes.summary(true),comments.summary(1)}"
                        );
    
    public function build_endpoint(){
        $endpoint = parent::build_endpoint();

        if (strpos($this->resources, 'all') !== false) {
           $endpoint = $endpoint.",".$this->endpoint_resources['events'].",".$this->endpoint_resources['posts'];
        }

        if (strpos($this->resources, 'events') !== false) {
           $endpoint = $endpoint.",".$this->endpoint_resources['events'];
        }
        
        if (strpos($this->resources, 'posts') !== false) {
           $endpoint = $endpoint.",".$this->endpoint_resources['posts'];
        }
        return $endpoint;

    }
                                                                                                                                                                                                   
}

class Gplus extends Feed{
    public $endpoint ='https://www.googleapis.com/plus/v1/people/#id/activities/public?key=#secret';
}

class Youtube extends Feed{
    
    public $endpoint_channelid ='https://www.googleapis.com/youtube/v3/channels?key=#secret&id=#id&part=id,contentDetails,snippet';
    
    public $endpoint_username ='https://www.googleapis.com/youtube/v3/channels?key=#secret&forUsername=#id&part=id,contentDetails,snippet';

    public $playlist = 'https://www.googleapis.com/youtube/v3/playlistItems?key=#secret&part=snippet,contentDetails&playlistId=#playListId&maxResults=25';

    public function get_feed(){
        $channel = json_decode( parent::get_feed()  );
        $channel_item  =$channel->items[0];
        $uploads_playlist = $channel->items[0]->contentDetails->relatedPlaylists->uploads;
        
        $params   = array("#playListId" => $uploads_playlist , "#secret" => $this->secret);
        $url      = strtr($this->playlist, $params);
        $playlist  = json_decode( Http::get($url, $this->headers) );
        
        $response = array (
            "user"    => array("name" => $channel->items[0]->snippet->title    , "link" => "https://www.youtube.com/channel/".$channel_item->id, "avatar" => $channel_item->snippet->thumbnails->default->url),
            "items"  => $playlist->items
        );

        return json_encode($response);
    }

    public function build_endpoint(){
        if($this->target == "default"){
            return $this->endpoint_channelid;
        }
        if($this->target == "username"){
            return $this->endpoint_username;
        }
        if($this->target == "channelid"){
            return $this->endpoint_channelid;
        }
        return "";
    }
}

class Vimeo extends Feed{
    public $endpoint = "https://api.vimeo.com/users/#id/videos";
    
    public function get_feed(){
        $access_token = $this->secret;
        $this->headers ="Authorization: Bearer $access_token\r\n" ;
        return parent::get_feed();
        
    }

}

class Twitter extends Feed{
    public $consumer_key;
    public $endpoint_usertimeline = "https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name=#id";
    public $endpoint_search = "https://api.twitter.com/1.1/search/tweets.json?q=#id";

    public function __construct($id, $secret, $consumer_key, $resources, $target) {
        parent::__construct($id, $secret, $resources, $target);
        $this->consumer_key = $consumer_key;

    }
   
    public function get_feed(){
        $oauth_response = $this->oauth();
        if($oauth_response['status_code']== 200 && $oauth_response['content']->token_type == "bearer"){
            $access_token = $oauth_response['content']->access_token; 
            $this->headers ="Authorization: Bearer $access_token\r\n" ;
            if($this->target == "search"){
                $this->id = urlencode($this->id);
            }
            
            return parent::get_feed();
        }
        return "";
        
    }
    public function oauth(){
        $mixed_key = $this->consumer_key.":".$this->secret;
        $key = base64_encode($mixed_key);

        $url ="https://api.twitter.com/oauth2/token";
        $header = "Content-Type: application/x-www-form-urlencoded;charset=UTF-8\r\n".
              "Authorization: Basic $key\r\n";
        $data = "grant_type=client_credentials";

        $response = Http::post($url, $header, $data , true);
        $headers  = Http::parse_headers($response['headers']);
        return array("content" => json_decode( $response['content']), "status_code" => $headers['status_code']);
    }

    public function build_endpoint(){
        if($this->target == "default"){
            return $this->endpoint_usertimeline;
        }
        if($this->target == "user"){
            return $this->endpoint_usertimeline;
        }
        if($this->target == "search"){
            return $this->endpoint_search;
        }
        return "";
    }
}

?>