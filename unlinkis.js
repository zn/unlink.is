// ==UserScript==
// @name        unlink.is
// @namespace   unlinkis.gentoo.moe
// @include     https://twitter.com/*
// @version     0.1
// @require     https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js
// @grant       GM_xmlhttpRequest
// ==/UserScript==

//Caution: This parsing method is not code-change resist.
var jsblock_regex = /<script[^>]*>[\s\S]([.\s\S]*?)<\/script>/g;
var urlgrabber_regex = /longUrl:[ ]*"(.+?)"/;
var linkdata_obj_regex = /var LinkData/;

var linkis_detect = /ln\.is/;

//Caution: This url extractor WILL CRASH when twitter changes working method of t.co
var tco_url_extract_regex = /location\.replace\("(.*?)"\)/;
var tco_url_detect = /http(|s):\/\/t.co\/[^\/]*$/;

function get_jsblock(str) {
  var match = str.match(jsblock_regex);
  var ret = [
  ];
  for (var i = 1; i < match.length; i++) {
    ret[i - 1] = match[i];
  }
  return ret;
}

function extract_url(str) {
  if (str.match(linkdata_obj_regex) !== null) {
    var match = str.match(urlgrabber_regex);
    if (match !== null) {
      return match[1];
    }
  }
  return null;
}

function convert_and_patch(url, jqobj, depth) {
  if(depth > 100) return;
  
  console.log("Resolving url: " + url);

  GM_xmlhttpRequest({
    method: 'GET',
    url: url,
    onload: function (resp) {
      //Check xmlhttpRequest ends with t.co
      if(resp.finalUrl.match(tco_url_detect) !== null) {
        var url_arr = resp.response.match(tco_url_extract_regex);
        if(url_arr === null) return;

        convert_and_patch(url_arr[1].replace(/\\\//g, "/"), jqobj, depth);
      }
      var jsblock_arr = get_jsblock(resp.response);
      var url = null;
      for (var i = 0; i < jsblock_arr.length; i++) {
        url = extract_url(jsblock_arr[i]);
        if (url !== null) break;
      }
      jqobj.attr("href", url);
      jqobj.text(url);
    },
    onerror: function (err) {
      console.log(err);
    }
  });
}

function tweet_handler(tweet) {
  var links = $(tweet).find("a");

  for(var i = 0; i < links.length; i++) {
    var match = $(links[i]).text().match(linkis_detect);

    if(match !== null) {
      convert_and_patch(links[i].href, $(links[i]), 0);
    }
  }
}

function get_tweets() {
  var matches = $('li').filter(function () {
    return this.id.match(/stream-item-tweet-*/);
  });

  for (var i = 0; i < matches.length; i++) {
    tweet_handler(matches[i]);
  }
}

var obs_config = {
  childList: true,
  characterData: true
};

var observer = new MutationObserver(function (mutations) {
  mutations.forEach(function (mutation) {
    var added_nodes = mutation.addedNodes;
    for (var i = 0; i < added_nodes.length; i++) {
      tweet_handler(added_nodes[i]);
    }
  })
});

observer.observe($('#stream-items-id') [0], obs_config);
get_tweets();

console.log("Unlink.is ready!");
