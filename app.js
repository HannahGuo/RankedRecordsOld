  var request = require('request');
  var http = require("http");
  var artistID = "47mIJdHORyRerp4os813jD";
  var artistName = "";
  var trackNameAndView = {
    "items": []
  };

  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: {
      'Authorization': 'Basic ' + (new Buffer.from("0bb76f3c5c634f2a87ee22115cca5ebf" + ':' + "0ad6b24acd504757bc73bb8986589354").toString('base64'))
    },
    form: {
      grant_type: 'client_credentials'
    },
    json: true
  };

  function makeCustomTrackFormat(trackInfo) {
    var idSTR = "";
    trackInfo.forEach(function (item, i) {
      if (!checkSongs(item.name)) idSTR += item.id + ",";
    });

    request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        var token = body.access_token;
        var options = {
          url: `https://api.spotify.com/v1/tracks/?ids=${idSTR.slice(0, -1)}`,
          headers: {
            'Authorization': 'Bearer ' + token
          },
          json: true
        };
        request.get(options, function (error, response, body) {
          if (!error && response.statusCode === 200) {
            body.tracks.forEach(function (item, i) {

              if (!(trackNameAndView.items.some(myItem => myItem.name == item.name))) {
                trackNameAndView.items.push({
                  name: item.name,
                  popularity: item.popularity
                });
              }
            });
          }
        });
      }
    });
  }

  function checkSongs(track) {
    var song = track.toString()
    return song.includes("Commentary") || song.includes("Karaoke") || song.includes("Voice Memo");
  }

  function getArtist() {
    request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        var token = body.access_token;
        var options = {
          url: `https://api.spotify.com/v1/artists/${artistID}`,
          headers: {
            'Authorization': 'Bearer ' + token
          },
          json: true
        };
        request.get(options, function (error, response, body) {
          if (!error && response.statusCode === 200) {
            artistName = body.name;
          }
        });
      }
    });
  }

  function getAlbums() {
    var offset = 0;
    request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        var token = body.access_token;
        var options = {
          url: `https://api.spotify.com/v1/artists/${artistID}/albums?include_groups=album,single,compilation&limit=50&offset=${50 * offset}`,
          headers: {
            'Authorization': 'Bearer ' + token
          },
          json: true
        };

        request.get(options, function (error, response, body) {
          if (!error && response.statusCode === 200) {
            body.items.forEach(function (item, i) {
              getAlbumTracks(item.id);
            });
          } else {
            console.log("Get Album Error: " + error + " " + JSON.stringify(response, null, 4));
          }
        });

      } else {
        console.log("Post Albums Error: " + error + " " + JSON.stringify(response, null, 4));
      }
    });
  }

  var albumTracksIDs = [];

  function getAlbumTracks(aID) {
    request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        var token = body.access_token;
        var options = {
          url: `https://api.spotify.com/v1/albums/${aID}/tracks?limit=50`,
          headers: {
            'Authorization': 'Bearer ' + token
          },
          json: true
        };
        request.get(options, function (error, response, body) {
          if (!error && response.statusCode === 200) {
            body.items.forEach(function (item, i) {
              albumTracksIDs.push({
                name: item.name,
                id: item.id
              });
            });
            if (albumTracksIDs.length > 35) {
              makeCustomTrackFormat(albumTracksIDs);
              albumTracksIDs = [];
            }
          } else {
            console.log("Get Album Tracks Error: " + error + " " + JSON.stringify(response, null, 4));
          }
        });
      } else {
        console.log("Post Album Tracks Error: " + error + " " + JSON.stringify(response, null, 4));
      }
    });
  }

  getAlbums();

  getArtist();

  http.createServer(function (request, response) {
    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8; no-cache"
    });

    trackNameAndView.items.flat();

    trackNameAndView.items.sort(function (a, b) {
      return b.popularity - a.popularity
    });

    response.write(`Getting Ranked Records of: ${artistName}<br>`);
    response.write(`Total Unique Records: ${trackNameAndView.items.length} <br><br>`);

    for (var i = 0; i < trackNameAndView.items.length; i++) {
      response.write(`<span id="testID"> ${i + 1} - Popularity Score ${trackNameAndView.items[i].popularity} - ${trackNameAndView.items[i].name}</span><br>`);
    }

    response.end();

  }).listen(8888);