<?php
class Http {
    public static function get($url , $header) {
    	
    	 $opts = array(
          "ssl"=>array(
                "verify_peer"=>false,
                "verify_peer_name"=>false,
            ),
          'http'=>array(
            'method'=>"GET",
            'header'=>$header 
          )
        );
        $context  = stream_context_create($opts);
        return  file_get_contents($url, false, $context);
    }

    public static function post($url , $header , $data , $returnHeader = false) {
    	$opts = array(
            "ssl"=>array(
                "verify_peer"=>false,
                "verify_peer_name"=>false,
            ),
            'http' =>
                array(
                'method'  => "POST",
                'header'  => $header,
                'content' => $data,
              )
        );
        $context  = stream_context_create($opts);
        $content =  file_get_contents($url, false, $context);
        if($returnHeader){
        	return array("content" => $content , "headers" => $http_response_header);

        }else{
        	return $content;
        }

    }

    public static function parse_headers( $headers ){
        
        $head = array();
        foreach( $headers as $k=>$v )
        {
            $t = explode( ':', $v, 2 );
            if( isset( $t[1] ) )
                $head[ trim($t[0]) ] = trim( $t[1] );
            else
            {
                $head[] = $v;
                if( preg_match( "#HTTP/[0-9\.]+\s+([0-9]+)#",$v, $out ) )
                    $head['status_code'] = intval($out[1]);
            }
        }
        return $head;
    }



}

?>