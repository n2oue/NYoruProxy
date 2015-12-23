var http = require('http');  
var url = require('url');
var fs = require('fs');

var twitterAPI = require('node-twitter-api');
var twitter;

var model = require('../model');
var Users = model.Users;

var setting_path = "setting.json";

fs.readFile(setting_path, function(err,data) {
    if(err) {
        console.log(err);
    } else {
        var setting = eval('('+data+')');

        twitter = new twitterAPI({
            consumerKey: setting.consumerKey,
            consumerSecret: setting.consumerSecret,
            callback: setting.callback
        });
    }
});


exports.requestToken = function(req, res, next) {
    twitter.getRequestToken(function(error, requestToken, requestTokenSecret, results){
        if (error) {
            console.log("Error getting OAuth request token : " + error);
            res.send("yeah no. didn't work.");
        } else {
            //store token and tokenSecret somewhere, you'll need them later; redirect user
            req.session.oauth = {};
            req.session.oauth.token = requestToken;
            req.session.oauth.secret = requestTokenSecret;

            res.redirect(twitter.getAuthUrl(requestToken)); 
        }
    });
};

exports.accessToken = function(req, res, next) {
    if(req.session.oauth) {
        var requestToken = req.session.oauth.token;
        var requestTokenSecret = req.session.secret;
        var oauth_verifier = req.query.oauth_verifier;

        twitter.getAccessToken(requestToken, requestTokenSecret, oauth_verifier, function(error, accessToken, accessTokenSecret, results) {
            if (error) {
                console.log(error);
            } else {
                //store accessToken and accessTokenSecret somewhere (associated to the user) 
                //Step 4: Verify Credentials belongs here 
                Users.update({screen_name: results.screen_name}, 
                    { apikey: accessToken, apisecret : accessTokenSecret }, 
                    { upsert: true, multi: false }, function(err) {

                    if(err) {
                        console.log(err);
                        next(new Error("db error"));
                    } else {
                        Users.update({screen_name: results.screen_name}, 
                            { enable: true, created : Date.now() }, 
                            { upsert: false, multi: false }, function(err) {
                            if(err) {
                                console.log(err);
                                next(new Error("db error"));
                            } else {
                                res.render('authorized');
                            }
                        });
                    }
                }); 
            }
        })
    } else {
        next(new Error("you're not supposed to be here."));
    } 
};


exports.upload = function(req, res, next) {
	var msg = req.body.message;
	var username = req.body.username;
	var img = req.files.media.path;

    if(msg == null) msg = "";

    Users.findOne({'screen_name': username, 'enable': true}, function(err, user) {
        if(err) {
            console.log(err);
            next(new Error(err));
        } else {

            var accessToken = user.apikey;
            var accessTokenSecret = user.apisecret;

            encode(img, function(err, imageData) {
                twitter.statuses("upload_media", {
                        media: imageData,
                        isBase64: true
                    },
                    accessToken,
                    accessTokenSecret,
                    function(error, data, response) {

                        var api_res = JSON.parse(data);
                        
                        twitter.statuses("update", {
                            status: msg,
                            media_ids: [api_res.media_id_string]
                        },
                        accessToken,
                        accessTokenSecret,
                        function(error, data, response) {
                            //if (error) {
                            //    // something went wrong
                            //    console.log(error);
                            //} else {
                                // data contains the data sent by twitter
                                var image_url;
                                var api_res = JSON.parse(data);
                                if (api_res.entities.media) {
                                    image_url = api_res.entities.media[0].display_url;
                                } else {
                                    image_url = api_res.entities.urls[-1].display_url;
                                }
                                res.render('result',{ image_url : " " }, function(err, xml){
                                    if(err) {
                                        console.log(err);        
                                    } else {
                                        res.send(xml);        
                                    } 
                                });
                            //}                                                    
                        });                        
                    }
                );    
            });
        }
    });
}

var encode = function(filename, callback) {
    var file = fs.readFile(filename, function(err, data) {
        callback(err, new Buffer(data).toString('base64'));
    });
}
