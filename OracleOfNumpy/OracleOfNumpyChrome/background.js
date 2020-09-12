
var firebaseConfig = {
    apiKey: "AIzaSyA0Vum3JhWVP3tS7IjjsALkYKRHHElU5n0",
    authDomain: "oracleofnumpy.firebaseapp.com",
    databaseURL: "https://oracleofnumpy.firebaseio.com",
    projectId: "oracleofnumpy",
    storageBucket: "oracleofnumpy.appspot.com",
    messagingSenderId: "229231872455",
    appId: "1:229231872455:web:ea9e32e2f440c2f47571e2"
  };
  // Initialize Firebase
firebase.initializeApp(firebaseConfig);
var db = firebase.firestore();
var allDomains = []
var curr_tab = 0
var user_friends = []
var found = false
var lastUrl = ""
var lastFriend = ""
var successURL = 'https://www.facebook.com/connect/login_success.html';
var appID = '225945231965869';
if ( ! localStorage.getItem('FBaccessToken')) {
   var path = 'https://www.facebook.com/dialog/oauth?';

   var queryParams = ['client_id=' + appID, 'redirect_uri=' + successURL, 'response_type=token', 'display=popup', 'scope=user_friends'];
   var query = queryParams.join('&');
   var url = path + query;

   chrome.windows.create({
      'url': url,
      'type': 'popup'
   }, function(window) {});
}


var enabled = true
function windowClosed(){
  db.collection("Users").doc(localStorage.getItem('UserId')).update({
  curr_tab: ""
  })
}

function httpGetAsync(theUrl, callback, rt)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.response);
    }
    xmlHttp.open("GET", theUrl, true); // true for asynchronous
    xmlHttp.responseType = rt;

    xmlHttp.send(null);
}
function webpageGetAsync(theUrl, layer, callback, rt, tabId)
{
  if(tabId == curr_tab){
    if(theUrl.search("google.com/search") == -1){
      var xmlHttp = new XMLHttpRequest();
      xmlHttp.onreadystatechange = function() {
          if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
              callback(xmlHttp.response, layer, tabId, theUrl);
      }
      xmlHttp.open("GET", theUrl, true); // true for asynchronous
      xmlHttp.responseType = rt;
      xmlHttp.setRequestHeader("Accept", "text/html")
      xmlHttp.send(null);
    }
    else{
      var path = "https://www.googleapis.com/customsearch/v1?key=AIzaSyA0Vum3JhWVP3tS7IjjsALkYKRHHElU5n0&cx=1c96db6827da2902e&"
      var params = theUrl.split('search?')[1]
      path = path + params
      webpageGetAsync(path, layer, extractLinksGoogle, "json", tabId)

    }
  }
}

function initFB(tabId, changeInfo, tab) {
   if (changeInfo.url && changeInfo.url.indexOf(successURL) === 0) {
      //localStorage.setItem('FBaccessToken', accessTokenFromSuccessURL(changeInfo.url), tabId);
      localStorage.setItem('FBaccessToken', 'EAADNfvlKPq0BABgSsXpMj2DDsXyQXPsb7UhtAawI6Ij1yZA70lJIolarggxhoDiZCS057ZCzpl6ZADoZAORNDdNyD31uZAWBWGPx44noe1fMS25zLbBDvHSkjMZCCs0TG4Fpk4cjiNnuZBZCEd9zdqvN5YiI0ZBmaUJXZBuYkZAYgV28TrX7JDBlU26Jce7ImerpoBJQz0GaosbIF2sBispVCYaF');
      chrome.tabs.remove(tabId);
      chrome.tabs.onUpdated.removeListener(initFB);
      chrome.tabs.onUpdated.addListener(onTabUpdated);
      chrome.tabs.onActivated.addListener(onActiveUpdated);
      chrome.windows.onFocusChanged.addListener(function(windowId) {
          if (windowId === -1) {
               windowClosed()
          } else {
              chrome.windows.get(windowId, function(chromeWindow) {
                  if (chromeWindow.state === "minimized") {
                      windowClosed()
                  }
              });
          }
      });
      var options = {
        type: "basic",
        title: "Facebook Authentication Successful",
        message: "Enjoy your token!",
        iconUrl: "images/fb-circle.png"
      }
      chrome.notifications.create('fb-connect-success', options);
      var path = "https://graph.facebook.com/debug_token?input_token=" + localStorage.getItem('FBaccessToken') + "&access_token=225945231965869|d8599c67232631470d66dc9aa84c253c"
      httpGetAsync(path, getId, "json")

   }

}
function onTabUpdated(tabId, changeInfo, tab){

  onNewPage(tabId);
}
function onActiveUpdated(activeInfo){

    onNewPage(activeInfo.tabId);
}

function onNewPage(tabId){

  if(enabled){
    found = false
    curr_tab = tabId
    allDomains = []
    chrome.tabs.get(tabId, function(tab){
          let url = tab.url

          console.log("URL: " + url)
          if(url){
            db.collection("Users").doc(localStorage.getItem('UserId')).update({
            curr_tab: url
            })
            var domainsToCheck = [getDomain(url)]
            allDomains.push(getDomain(url))
            isFriendThere(domainsToCheck, 0, tabId)

            if (!found){
              if(url.search("google.com/search") == -1){
                chrome.tabs.executeScript({code: '  Array.from(document.getElementsByTagName("a")).map(a => a.href)'}, function(resultArr) {
                  var links = resultArr[0]
                  parseLinks(links, 1, tabId, url)
                });
              }
              else{
                var path = "https://www.googleapis.com/customsearch/v1?key=AIzaSyA0Vum3JhWVP3tS7IjjsALkYKRHHElU5n0&cx=1c96db6827da2902e&"
                var params = url.split('search?')[1]
                path = path + params
                console.log("GOOGLE PATH " + path)
                webpageGetAsync(path, 1, extractLinksGoogle, "json", tabId)

              }
            }
          }
        })
  }
}
function extractLinksJQ(data, layer, tabId, url){
//FIX ME
  //var links = $(data).find('a[href]').attr('href').text

  var links = $('a[href]', $(data)).map(function(i,el) { return $(el).attr('href'); }).get();

  parseLinks(links, layer, tabId, url)
}
function extractLinksGoogle(data, layer, tabId, url){
  var links = []

  data.items.forEach((item) => {
    links.push(item.link)
  });
  parseLinks(links, layer, tabId, url)
}

function getDomain(url){

  var path = url.split('//');
  if (path.length >1){
    path = path[1]
    domain = path.split('/')[0]
    return domain
  }
  else{
    return "null"
  }
}

function parseLinks(links, layer, tabId, url){

  if(tabId == curr_tab){
    var trimmedLinks = [...new Set(links)];



    var curr_domain = getDomain(url)

    var superTrimmedLinks = []
    var rawDomains = []
    trimmedLinks.forEach(function(item) {

      var domain = getDomain(item)
        if(domain != curr_domain && domain !="null"){
          superTrimmedLinks.push(item)
          rawDomains.push(domain)
        }
    });
    //trim domains, if domains is not in global list, add it and send message to content with layer
    var domains = [...new Set(rawDomains)];
    var domainsToCheck = []
    domains.forEach(function(item){
      if(!allDomains.includes(item)){
        allDomains.push(item)
        domainsToCheck.push(item)
      }
    })
    console.log(domainsToCheck)

    isFriendThere(domainsToCheck, layer, tabId)
    //console.log("STL " + superTrimmedLinks)
    if (layer<2 && !found){
      superTrimmedLinks.forEach(function(item) {
        webpageGetAsync(item, layer+1, extractLinksJQ, "text", tabId)
      });
    }

  }
}

function isFriendThere(links, layer, tabId){
  //RETURN BOOLEAN

  if(tabId == curr_tab){
    var friendList = user_friends

    friendList.forEach((item) => {

      var id = item.id
      var docRef = db.collection("Users").doc(id);

      docRef.get().then(function(doc) {
          if (doc.exists) {

            var url = getDomain(doc.data().curr_tab)

            if(links.includes(url) && !found && (url != lastUrl || id != lastFriend)){
              console.log("Matching domain " + url)
              console.log("Checked Links: " + links)

              console.log("one friend " + layer + " clicks away!")
              found = true

              if (layer == 0){
                lastUrl = url;
                lastFriend = id;
                var msg = "Oh hey, didn't see you there! \nYou just bumped into " + item.name + " on " + url
                alert(msg);

                // var options = {
                //   type: "basic",
                //   title: "Oh hey, didn't see you there!",
                //   message: msg,
                //   iconUrl: "images/fb-circle.png",
                //   priority: 2
                //
                // }
                // chrome.notifications.create('found-friend', options, function(){console.log("last error: ", chrome.runtime.lastError)})
                var docCurr = db.collection("Users").doc(localStorage.getItem('UserId'));
                docCurr.get().then(function(d) {
                      docRef.update({
                        bumped: !d.data().bumped
                      });
                      docCurr.update({
                        bumped: false
                      });
                });
                console.log("updated docref")
                var destination = url.substring(4);
                var lh = "http://localhost:8081/" + destination + "/";
                var xmlHttp = new XMLHttpRequest();
                xmlHttp.open("POST", lh, true); // true for asynchronous
                xmlHttp.send(null);
                //trigger python script


              }
              else{
                var msg = "Would you look at that? \nYou're " + layer + " clicks away from being on the same website as someone you know!"
                // var options = {
                //   type: "basic",
                //   title: "Would you look at that?",
                //   message: msg,
                //   iconUrl: "images/fb-circle.png",
                //   priority: 2
                //
                // }
                // chrome.notifications.create('close-friend', options, function(){console.log("last error: ", chrome.runtime.lastError)})

                alert(msg);
              }
              return found
            }

          } else {
              // doc.data() will be undefined in this case
              console.log("No such document!");
              return found
          }
      }).catch(function(error) {
          console.log("Error getting document:", error);
          return found
      });

    });
  }
  return found

}

function accessTokenFromSuccessURL(url) {
   var hashSplit = url.split('#');
   if (hashSplit.length > 1) {
      var paramsArray = hashSplit[1].split('&');
      for (var i = 0; i < paramsArray.length; i++) {
         var paramTuple = paramsArray[i].split('=');
         if (paramTuple.length > 1 && paramTuple[0] == 'access_token')
            return paramTuple[1];
      }
   }
   return null;
}

function getId(data){
  console.log(data)

  localStorage.setItem('UserId', data.data.user_id);

  $.getJSON("https://api.ipify.org?format=json",
        function(data) {



            db.collection("Users").doc(localStorage.getItem('UserId')).set({
              user_id: localStorage.getItem('UserId'),
              curr_tab: "",
              curr_ip: data.ip,
              bumped: false
            })
        })

  .then(function() {
    console.log("Document successfully written!");
  })
  .catch(function(error) {
    console.error("Error writing document: ", error);
  });

  chrome.alarms.create("BumpedInto", {periodInMinutes: 1})
  console.log("alarm created")
  chrome.alarms.onAlarm.addListener(hasBeenBumpedInto)
  console.log("alarm event attached")

  var path = "https://graph.facebook.com/v8.0/" + data.data.user_id + "/friends?access_token=225945231965869|d8599c67232631470d66dc9aa84c253c"
  httpGetAsync(path, getFriends, "json")
}
function getFriends(data){
  console.log(data)
  user_friends = data.data
//  localStorage.setItem('UserId', data.data.user_id);

}


function hasBeenBumpedInto(){
  console.log("alarm triggered")
  var docRef = db.collection("Users").doc(localStorage.getItem('UserId'));

  docRef.get().then(function(doc) {
      if (doc.exists) {
        var flag = doc.data().bumped
        console.log("flagged = " + flag)
        if(flag){

          onNewPage(curr_tab);
        }
      }
  });
}


if( ! localStorage.getItem('FBaccessToken')) {
  chrome.tabs.onUpdated.addListener(initFB);
}







//BELLS AND WHISTLES

//transmit image to other computer
//design pop up to have login buttons
