/***********************************************
socialmix  1.3.2
jQuery Socialmix Timeline 
Copyright (c) Andrea Di Toro 
http://kodiga.com/jquery-socialmix-timeline/ 
***********************************************/

(function ( $ ) {
"use strict";
$.fn.socialmix.utils = {
	   
    ini: function(){
        moment.locale(this.options.momentLocale);
    },
    //Choose how to map a feed
    mapFeeds : function(feed , data , tags ){
        if (feed.customMapper){
            return feed.customMapper.call(this, data, tags, feed);
        }
        
        try{
            switch(feed.type) {
            case "facebook":
                return  this.mapFacebok(data,tags,feed);
            case "twitter":
                if(feed.target === "search"){
                    return  this.mapTwitterSearch(data,tags,feed);
                }else{
                    return  this.mapTwitter(data,tags,feed);
                } 
                break;
            case "gplus":
                return  this.mapGplus(data,tags,feed);
            case "rss":
                return  this.mapRss(data,tags,feed);
            case "youtube":
                return  this.mapYoutube(data,tags,feed);
            case "vimeo":
                return  this.mapVimeo(data,tags,feed);
            case "custom":
            case "custom_object":
                return this.mapCustomData(data,feed);
            default:
                return [];
            }


        }catch(err) {
           console.error(feed.type + " Error . Please check API-KEY in your settings file. Make sure the "+feed.type+" api key is a valid API-KEY");
           console.error(err);
           return [];
        }

    },

    getTemplateManager : function(){
        return this.options.templateManager;
    },

    getSystemDate : function(strDate){
        var time = Date.parse( strDate );
        if( isNaN(time) ){//IE
            time = Date.parse( strDate.replace(/( \+)/, " UTC$1"));
        }
        if( isNaN(time) ){//safari
            time = Date.parse( strDate.replace(/-/g,"/").replace(/[TZ]/g," "));
        }
        
        return moment( time );

    },
    //Normal date format 
    dateFormat : function(systemDate){
        return moment(systemDate).format(this.options.momentFormat);
    },

    //Format a date in small format 
    dateFormatSmall : function(systemDate){
      
        return moment(systemDate).format(this.options.momentSmallFormat);
    },

    //Format date for internal use. Don't use it for display 
    tagDateFormat : function(systemDate){
        return systemDate.format("DD-MM-YYYY");
    },

    //Trasform all url in text in element <a>
    fixTextTag : function(text){
        if( text === undefined  || text === null){
          return "";
        }else{
            return anchorme.js( text );
        }

    },
    fixTextTag2 : function (inputText){
        var replacedText, replacePattern1, replacePattern2, replacePattern3;

        //URLs starting with http://, https://, or ftp://
        replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
        replacedText = inputText.replace(replacePattern1, "<a href='$1' target='_blank'>$1</a>");

        //URLs starting with "www." (without // before it, or it'd re-link the ones done above).
        replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
        replacedText = replacedText.replace(replacePattern2, "$1<a href='http://$2' target='_blank'>$2</a>");

        //Change email addresses to mailto:: links.
        replacePattern3 = /(([a-zA-Z0-9\-\_\.])+@[a-zA-Z\_]+?(\.[a-zA-Z]{2,6})+)/gim;
        replacedText = replacedText.replace(replacePattern3, "<a href='mailto:$1'>$1</a>");

        return replacedText;
    },

    //Just a trim function
    customTrim : function(x) {
        return x.replace(/^\s+|\s+$/gm,"");
    },

    //Replace entities in a tweet
    replaceTwitterEntities:function (tweet){
        var  nofollow= "rel='nofollow'";
        //replace hastah
        $.each(tweet.entities.hashtags , function(key , hashtag){
            var htmlTag ="<a "+nofollow+" href='https://twitter.com/hashtag/"+
            hashtag.text+"' target='_blank'>#"+hashtag.text+"</a>" ;
          tweet.text = tweet.text.replace("#"+hashtag.text ,htmlTag );
        }  );

        //replace url
        $.each(tweet.entities.urls , function(key , url){
            var htmlUrl = "<a "+nofollow+" href='"+url.url+
            "' target='_blank'>"+url.display_url+"</a>";
          tweet.text = tweet.text.replace(url.url , htmlUrl);
        }  );

        // replace mentions
         $.each(tweet.entities.user_mentions , function(key , mention){
            var htmlMention = "<a "+nofollow+" href='http://twitter.com/"+
            mention.screen_name+"' target='_blank'>"+mention.screen_name+"</a>";
          tweet.text = tweet.text.replace(mention.screen_name , htmlMention);
        }  );
    },

    mapCustomData: function( data ){
        var self = this;
        return $.map( data, function( feed ) {
            var systemDate = self.getSystemDate(feed.date);
            var tagDate = self.tagDateFormat(systemDate);
            var tags = [];
            if(feed.tags !== undefined){
                tags = self.options.templateManager
                    .populateTagList( feed.tags );
            }
            if(feed.hasOwnProperty("imgs")){

                for (var i = feed.imgs.length - 1; i >= 0; i--) {
                    if(! feed.imgs[i].hasOwnProperty("popSrc")){
                        feed.imgs[i].popSrc =feed.imgs[i].src; 
                    }

                }
            }
            if(feed.hasOwnProperty("youtubeVideos")){
                for (var x =0 ; x < feed.youtubeVideos.length; x++) {
                    console.log(x);
                    var yId = feed.youtubeVideos[x].id;
                    var item = {src : "https://img.youtube.com/vi/"+yId+"/0.jpg", 
                                popSrc: "http://youtube.com/watch?v="+yId, 
                                type: "iframe" , 
                                classes: "sm-video"  };
                    
                    if(!feed.hasOwnProperty("imgs")){
                        feed.imgs = [];
                        console.log("reset");
                    }
                    feed.imgs.push(item);
                }

            }

            if(feed.hasOwnProperty("titleLink")){
                feed.originLink = feed.titleLink;
            }
            var obj =   {
                source: "custom", 
                fullDate: self.dateFormat( systemDate ),
                systemDate: systemDate,
                text: self.fixTextTag(feed.text),
                tags: tags,
                tagDate: tagDate,
   
            };
            $.extend(feed, obj);
            console.log(feed);
            return feed;
        });
    },

    //trasform facebook feed in a common format 
	mapFacebok : function(data,tags,feedOpt){
        //save scope reference
        var self = this;
        //data
        var posts_data = ((data.posts) ? data.posts.data : []);
        var events_data = ((data.events) ? data.events.data : []);
        //create user object
        var user = {
            "name":data.name,
            "link":data.link,
            "avatar":data.picture.data.url
        };
        //create source
        var sourceId = "source-"+ feedOpt.type +"-"+feedOpt.id;
        self.options.templateManager.setSourceName("facebook" ,sourceId, user );
        
        var posts =  $.map( posts_data, function( feed ) {

            var attach = {};
            if (feed.attachments !== undefined){
                attach = feed.attachments.data[0];
            }
            
            var action = "";
            if (feed.story !== undefined ){
                action =  feed.story.replace(user.name , "");
            }

            var imgs = (feed.full_picture !== undefined ) ? [{src : feed.full_picture , popSrc : feed.full_picture, type : "image" }] : [];
            if( attach.subattachments !== undefined ){
                imgs = [];
                $.each(attach.subattachments.data, function(i,subattachment){
                    var ks =  Object.keys(subattachment.media);
                    if(ks[0] === "image"){
                        
                        imgs.push( { src  : subattachment.media[ks[0]].src, popSrc : subattachment.media[ks[0]].src, type : "image" } );
                    }
                });
            }

            var message = (feed.message !== undefined ) ? feed.message : "";
            var text = (attach.description !== undefined ) ? attach.description : "";

            //cuanto el attchament es igual al message principal
            if(message === text){ 
                text = "";
            }

            var title = "";
            if(attach.title !== undefined ){
                title =  attach.title;
            }else if( feed.title !== undefined ){
                title = feed.title;
            }

            var embed =  (feed.embed_html !== undefined) ? [ {html : feed.embed_html }] : [] ;
            if(attach && attach.type === "video_inline"){
                if(feed.full_picture === attach.media.image.src ){
                  imgs=[];
                }
                var htmlEmbed = "<div class='mfp-hide sm-pop sm-pop-"+feed.id+"'><div class='fb-video' data-href='"+
                    attach.target.url+"' data-width='500' data-allowfullscreen='true'></div></div>";
                //embed.push({html : htmlEmbed});
                $("body").append(htmlEmbed);
                imgs.push({ src  :  attach.media.image.src, popSrc : ".sm-pop-"+feed.id, type : "inline" , classes: "sm-video"  });
                //////////////////
            }
            if(attach && attach.type === "video_share_youtube"){
                if(feed.full_picture === attach.media.image.src ){
                  imgs=[];
                }
                var url =decodeURIComponent(attach.target.url);
                var url2 = url.split(".php?u=")[1];
                var url3 = url2.split("&h=")[0];

                if (url.indexOf("attribution_link") > -1){
                    var app1 = decodeURIComponent(url3).split("/watch?v=")[1];
                    url3 = "http://youtube.com/watch?v="+app1.split("&")[0];
                }
                imgs.push({ src  :  attach.media.image.src, popSrc : url3, type : "iframe" , classes: "sm-video"  });
                
            }


            if( attach && attach.type === "animated_image_share"){
                imgs=[];
                imgs.push({ src  : attach.media.image.src, popSrc : feed.link, type : "image" ,  classes : "sm-gif" });
            }

            var link = user.link+"posts/"+feed.id.split("_")[1];
            var systemDate =self.getSystemDate( feed.created_time );
            var tagDate = self.tagDateFormat(systemDate);
            var shares = [];
            if(feed.likes){
                shares.push({"type" : "likes", "count" :feed.likes.summary.total_count , "icon" : "fa-thumbs-up" });
            }
            if(feed.shares){
                shares.push({"type" : "share", "count" :feed.shares.count,"icon" : "fa-share" });
            }            
            if(feed.comments){
                shares.push({"type" : "comments", "count" : feed.comments.summary.total_count, "icon" : "fa-comment" });
            }

            return { 
                source: "facebook" ,
                sourceFilter : sourceId,
                cardIcon: self.options.icons.facebook ,
                id: feed.id,
                fullDate: self.dateFormat(systemDate ),
                systemDate: systemDate,
                link:link,
                message: self.fixTextTag2(message),
                imgs: imgs,
                title: title,
                text: self.fixTextTag(text),
                user: user,
                sourceUser: {},
                action: action,
                originLink: (feed.link) ? feed.link : link,
                embed: embed,
                tags: tags,
                tagDate: tagDate,
                shares :shares 
            };
        });
        
        var events = $.map( events_data, function( event ) {
            var systemDate =self.getSystemDate( event.start_time );
            var endDate = false;
            var duration = false;
            if(event.end_time){
                var systemEndDate = self.getSystemDate( event.end_time );
                duration =moment.duration(systemEndDate.diff(systemDate));
                endDate = self.dateFormat(systemEndDate );
                duration =duration.humanize();// self.dateFormat( duration );
            }
            var tagDate = self.tagDateFormat(systemDate);
            var id_imgs = [];
            var imgs = [];
            if (event.cover){
                imgs.push({src : event.cover.source , popSrc : event.cover.source, type : "image" });
                id_imgs.push(event.cover.id);
            }

            if(event.photos){
                $.each(event.photos.data, function(i, photo){
                    var img = self.selectBestPhoto(photo.images);
                    if(img && (id_imgs.indexOf(photo.id) === -1 )){
                        imgs.push(img);
                        id_imgs.push(photo.id);
                    }
                });
            }
            var shares = [
                { title : "Attending" ,"count" : event.attending_count},
                { title : "Interested" ,  "count" :event.interested_count}
            ];

            return {
                source: "facebook" ,
                cardType: "event",
                sourceFilter: sourceId,
                id: event.id,
                originLink: "https://www.facebook.com/events/"+event.id,
                title: event.name,
                cardIcon: self.options.icons.facebook,
                fullDate: self.dateFormat(systemDate ),
                systemDate: systemDate,
                tagDate: tagDate,
                text: self.fixTextTag(event.description),
                imgs: imgs,
                user: user,
                shares:shares,
                endDate:endDate,
                duration: duration
            };
        });
        return $.merge(posts, events);

    },

    selectBestPhoto: function(images){
        if(images.length > 0){
            return {src : images[0].source , popSrc : images[0].source, type : "image" };
        }else{
            return false;
        }

    },

    mapTwitterSearch : function(data , tags, feedOpt){
        return this.mapTwitter(data.statuses , tags, feedOpt);
    },

    //trasform twitter feed in a common format 
    mapTwitter : function(data , tags, feedOpt){
        var self = this;
        var user ={
            name: data[0].user.screen_name,
            link: "https://twitter.com/"+data[0].user.screen_name,
            avatar: data[0].user.profile_image_url_https
        };
        var sourceId = "source-"+ feedOpt.type +"-"+feedOpt.id;
        self.options.templateManager.setSourceName("twitter",sourceId, user );
        return $.map( data, function( feed ) {
            self.replaceTwitterEntities(feed);
            var action = "";
            var sourceUser = {};
            if ( feed.retweeted_status !== undefined ){
                action = "RT";
                sourceUser =  {
                    "name":feed.retweeted_status.user.screen_name,
                    "link":"https://twitter.com/"+feed.retweeted_status.user.screen_name,
                    "avatar":feed.retweeted_status.user.profile_image_url_https,
                };
            }

            var retweetCount=feed.retweet_count;
            var favoriteCount=feed.favorite_count;

            if ( feed.retweeted_status !== undefined ){
                var tmpR = feed.retweeted_status.retweet_count;
                var tmpF = feed.retweeted_status.favorite_count;
                retweetCount = Math.max(retweetCount, tmpR);
                favoriteCount = Math.max(favoriteCount, tmpF);
            }

            var imgs = [];
            var embed = [];
            if( feed.extended_entities !== undefined &&
                feed.extended_entities.media !== undefined ){
                
                $.each(feed.extended_entities.media , function(i,media){
                
                    if(media.type === "animated_gif" ||  media.type === "video" ){
                        var variants = media.video_info.variants;
                        var bestWebm = { bitrate: -1, url : "" };
                        var bestMp4 = { bitrate: -1, url : "" };
                        for (var x =0 ; x < variants.length ; x ++){
                            if(variants[x].content_type  === "video/mp4" &&
                              variants[x].bitrate > bestMp4.bitrate ){
                                bestMp4 =  variants[x];
                            }
                        
                            if(variants[x].content_type  === "video/webm" && 
                                variants[x].bitrate > bestWebm.bitrate ){
                                bestWebm =  variants[x];
                            }

                        }
                        if(bestWebm.url !== "" || bestMp4 !== "" ){
                            var htmlEmbed = "<div class='mfp-hide sm-pop sm-pop-"+feed.id_str+"'><video controls  name='media'><source src='"+bestWebm.url+
                            "' type='video/webm'><source src='"+bestMp4.url+"' type='video/mp4'></video></div>";
                            $("body").append(htmlEmbed);
                            imgs.push({ src  :  media.media_url_https, popSrc : ".sm-pop-"+feed.id_str, type : "inline" , classes: "sm-video"  });
                        }else{

                            imgs.push({ src  :  media.media_url_https, popSrc :  media.media_url_https, type : "image"  });
                        }
                    
                    }else{
                        imgs.push({ src  :  media.media_url_https, popSrc :  media.media_url_https, type : "image"  });
                    }
                 });
            }

            var systemDate = self.getSystemDate(feed.created_at);
            var tagDate = self.tagDateFormat(systemDate);
            var fullDate = self.dateFormat(systemDate );
            return {
                source: "twitter",
                sourceFilter : sourceId,
                cardIcon: self.options.icons.twitter,
                id: feed.id_str,
                fullDate: fullDate,
                systemDate: systemDate,
                link: "https://twitter.com/statuses/"+feed.id_str,
                message: "",
                imgs: imgs,
                title: "",
                text: feed.text,
                user: user,
                sourceUser: sourceUser,
                action: action,//feed.attachments.data[0].type,
                originLink:  "https://twitter.com/statuses/"+feed.id_str,
                tags: tags,
                tagDate: tagDate,
                embed: embed,
                shares: [
                    {"type" : "retweet" ,"count" : retweetCount ,  "icon" : "fa-retweet"},
                    {"type" : "favorite" ,  "count" : favoriteCount ,  "icon" : "fa-heart"}
                ] 
            };
          });

    },

    //trasform rss feed in a common format 
    mapRss: function(data , tags){
        var self = this;
        var feedLink = data.responseData.feed.link;
        var xml = $(data.responseData.xmlString);
        var type = data.responseData.feed.type;
       
        if ( type.match( /^rss*/ ) ) {
            xml = xml.filter( "rss" ).find( "channel" );
        } else if ( type.match( /^atom.*/ ) ) {
            xml = xml.filter( "feed" );
        }

        var tmp = document.createElement ("a");
        tmp.href = feedLink;
        var name = tmp.hostname.replace("www.", ""); 
        var user = {
            "name": name,
            "link": feedLink,
        };
        var sourceId = "source-rss-"+name;
        sourceId = sourceId.replace(".", "");
        self.options.templateManager.setSourceName("rss", sourceId, user );

        return $.map(data.responseData.feed.entries, function(entry, i) {
            var imgs = $.map( $("<div>"+entry.content+"</div>" ).find("img"),function(img){
                var src = $(img).attr("src");
                var pattern = /^((http|https|ftp):\/\/)/;
                if ( pattern.test(src)){
                    return {src : src , popSrc:src , type: "image" };
                  
                }
            });
              
            var entryXml;
            if ( type.match( /^rss*/ ) ) {
                entryXml = xml.find( "item" ).eq( i );
            } else if ( type.match( /^atom.*/ ) ) {
                entryXml = xml.find( "entry" ).eq( i );
            }else{
                entryXml = $("<div/>");
            }
            entryXml.find("[type*='image']").each(function(){
                imgs.push({src : $(this).attr("url") , popSrc :$(this).attr("url") , type: "image"  });
            });
              
            var tmpNames = [];
            for (var x = 0 ; x < imgs.length; x ++){
                var tmp = imgs[x].src.split("/");
                var imgsName = tmp[tmp.length-1];
               
                if(tmpNames[imgsName]  === undefined ){
                    tmpNames[imgsName] = imgs[x] ;
                }else if(tmpNames[imgsName].width < imgs[x].width){
                    tmpNames[imgsName] = imgs[x];
                }
            }
            var uniqueImgs = [];
            for( var y in tmpNames){
                uniqueImgs.push(tmpNames[y]);
            }

            var systemDate = self.getSystemDate( entry.publishedDate );
            var tagDate = self.tagDateFormat(systemDate);
            return {
                source: "rss", 
                sourceFilter : sourceId,
                cardIcon: self.options.icons.rss,
                title: entry.title,
                fullDate: self.dateFormat( systemDate ),
                systemDate: systemDate,
                link: entry.link,
                originLink: entry.link,
                text: entry.contentSnippet,
                user: user,
                imgs: uniqueImgs,
                tags: tags,
                tagDate: tagDate
            };
        });

    },
    
    //trasform google plus feed in a common format 
    mapGplus : function(data , tags, feedOpt){
        var self = this;
        var user ={
            "name": data.items[0].actor.displayName,
            "link": data.items[0].actor.url,
            "avatar": data.items[0].actor.image.url,
        };
        var sourceId = "source-"+ feedOpt.type +"-"+feedOpt.id;
        sourceId = sourceId.replace("+", "");
        self.options.templateManager.setSourceName("gplus", sourceId, user );
        return $.map( data.items, function( feed ) {
            var feedData = {};
            var text = "";
            if ( feed.object.attachments !== undefined ){
                feedData = feed.object.attachments[0];
                text = ( feedData.content !== undefined ) ? feedData.content : "";
              }
             
            var message = self.customTrim(  ( feed.object.content !== undefined ) ? feed.object.content : "" );
            var title =    self.customTrim( ( feedData.displayName !== undefined ) ? feedData.displayName : "" );

            if(message === text){
                text = "";
            }
            if(message === title || message.indexOf(title) > -1 ){
                title = "";
            }

            if( title.length >120 ){
                var tmp =  title.substr(0, 120 );
                var index=  tmp.indexOf(" ")+120;
                title = title.substr(0 , index) + " ...";
            }

            //source user
            var sourceUser =  {};
            var action = "";
            if ( feed.object.actor.displayName !== undefined  && feed.actor.id !== feed.object.actor.id){
                action = feed.verb;
                sourceUser =  {
                    "name":feed.object.actor.displayName,
                    "link":feed.object.actor.url,
                    "avatar":feed.object.actor.image.url,
                };
            }
            var  imgs = [];
            if ( feedData.image !== undefined ){
                imgs.push({src : feedData.image.url ,popSrc:feedData.image.url, type:"image"  } );
            }
            
            if( feedData.thumbnails !== undefined ){
                $.each(feedData.thumbnails, function(i,thumb){
                    imgs.push({ src  : thumb.image.url, popSrc : thumb.image.url, type: "image"  });
                });
            }

            if( ( feedData.embed !== undefined ) && feedData.objectType === "video"){
                imgs= [];
                var parts = feedData.embed.url.split("?")[0];
                var videoSrc = parts.replace("/v/", "/watch?v=").replace("/embed/", "/watch?v=");
                imgs.push({ src  : feedData.image.url, popSrc : videoSrc, type : "iframe" , classes: "sm-video" });
            }

            var systemDate = self.getSystemDate( feed.published );
            var tagDate = self.tagDateFormat(systemDate);
            var link = feed.object.url;
            return { 
                source: "gplus", 
                sourceFilter : sourceId,
                cardIcon: self.options.icons.gplus,
                id: feed.id,
                fullDate:  self.dateFormat(systemDate ),
                systemDate:  systemDate,
                link: link,
                message: self.fixTextTag(message),
                imgs: imgs,
                title: title,
                text: self.fixTextTag(text),
                user: user,
                sourceUser: sourceUser,
                action: action,//feed.attachments.data[0].type,
                originLink: (feedData.url !== undefined ) ? feedData.url : link,
                embed: [],
                tags: tags,
                tagDate: tagDate,
                shares: [
                    {"type" : "plusoners" ,"count" : feed.object.plusoners.totalItems , "icon" : "fa-plus"},
                    {"type" : "replies" ,  "count" : feed.object.replies.totalItems , "icon" : "fa-comment"}
                ]
            };
        });

    },

    mapYoutube:function(data , tags, feedOpt){
        var self = this;
        var user = data.user;
        var sourceId = "source-"+ feedOpt.type +"-"+feedOpt.id;
        sourceId = sourceId.replace("+", "");
        self.options.templateManager.setSourceName("youtube", sourceId, user );
        return $.map( data.items, function( feed  ) {
            var systemDate = self.getSystemDate( feed.snippet.publishedAt );
            var tagDate = self.tagDateFormat(systemDate);
            var videoId = feed.contentDetails.videoId;
            var videoSrc = "http://www.youtube.com/watch?v="+videoId;
            var embed = [];
            var link = "https://www.youtube.com/watch?v="+videoId;
            var imgs = [];
            imgs.push({ src  : feed.snippet.thumbnails.medium.url, popSrc : videoSrc, type : "iframe" , classes: "sm-video" });
            var description = feed.snippet.description;
            var maxLength = 350; // maximum number of characters to extract
            if(description.length > 350){
                var desc = description.substr(0, maxLength);
                desc = desc.substr(0, Math.min(desc.length, desc.lastIndexOf(" ")));
                description = desc + " ...";
            }
            return { 
                source: "youtube", 
                sourceFilter : sourceId,
                cardIcon: self.options.icons.youtube,
                id: feed.id,
                fullDate:  self.dateFormat(systemDate ),
                systemDate:  systemDate,
                link: link,
                message: "",
                imgs: imgs,
                title: feed.snippet.title,
                text: self.fixTextTag(description),
                user: user,
                sourceUser: {},
                action: "",
                originLink: link,
                embed: embed,
                tags: tags,
                tagDate: tagDate
            };
        });


    },
    mapVimeo:function(data , tags, feedOpt){
        var self = this;
        var sourceId = "source-"+ feedOpt.type +"-"+feedOpt.id;
        if(data.data.length >0){
            var user = { name : data.data[0].user.name };
            self.options.templateManager.setSourceName("vimeo", sourceId, user);
        }
        return $.map( data.data, function( feed  ) {
            var systemDate = self.getSystemDate( feed.created_time );
            var tagDate = self.tagDateFormat(systemDate);
            var videoSrc = feed.link;
            var embed = [];
            var link = feed.link;
            var imgs = [];
            imgs.push({ src  : feed.pictures.sizes[2].link, popSrc : videoSrc, type : "iframe" , classes: "sm-video" });
            var user = {
                name : feed.user.name,
                link : feed.user.link,
                avatar: feed.user.pictures.sizes[2].link
            };
            return { 
                source: "vimeo", 
                sourceFilter: sourceId ,
                cardIcon: self.options.icons.vimeo,
                id: feed.id,
                fullDate:  self.dateFormat(systemDate ),
                systemDate:  systemDate,
                link: link,
                message: "",
                imgs: imgs,
                title: feed.name,
                text: self.fixTextTag(feed.description),
                user: user,
                sourceUser: {},
                action: "",
                originLink: link,
                embed: embed,
                tags: tags,
                tagDate: tagDate
            };
        });


    }
};
}( jQuery ));