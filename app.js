  var request = require('request');
  var http = require("http");
  var artistID = "3Nrfpe0tUJi4K4DXYWgMUX";
  var artistName = "";
  var albumID = [];
  var trackID = [];
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

  function makeCustomTrackFormat(trackName, trackPopularity) {
    return {
      name: trackName,
      popularity: trackPopularity
    };
  }

  function chunkID(arr, chunkSize) {
    // Taken directly from https://stackoverflow.com/questions/8495687/split-array-into-chunks
    var R = [];
    for (var i = 0, len = arr.length; i < len; i += chunkSize)
      R.push(arr.slice(i, i + chunkSize));
    return R;
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
    request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        var token = body.access_token;
        var options = {
          url: `https://api.spotify.com/v1/artists/${artistID}/albums?include_groups=album,single,appears_on,compilation&limit=50`,
          headers: {
            'Authorization': 'Bearer ' + token
          },
          json: true
        };
        request.get(options, function (error, response, body) {
          if (!error && response.statusCode === 200) {
            for (let i = 0; i < body.items.length; i++) {
              albumID.push(body.items[i].id);
            }
            setTimeout(function () {
              getAlbumTracks();
            }, 8000);
          } else {
            console.log("Get Album Error: " + error + " " + JSON.stringify(response, null, 4));
          }
        });
      } else {
        console.log("Post Albums Error: " + error + " " + JSON.stringify(response, null, 4));
      }
    });
  }

  function getAlbumTracks() {
    request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        var token = body.access_token;
        for (var aID = 0; aID < albumID.length; aID++) {
          var options = {
            url: `https://api.spotify.com/v1/albums/${albumID[aID]}/tracks?limit=50`,
            headers: {
              'Authorization': 'Bearer ' + token
            },
            json: true
          };
          request.get(options, function (error, response, body) {
            if (!error && response.statusCode === 200) {
              body.items.forEach(function (item, i) {
                trackID.push(item.id);
              });
              getTrackNameAndPopularity();
              trackID = [];
            } else {
              console.log("Get Album Tracks Error: " + error + " " + JSON.stringify(response, null, 4));
            }
          });
        }
      } else {
        console.log("Post Album Tracks Error: " + error + " " + JSON.stringify(response, null, 4));
      }
    });
  }

  function getTrackNameAndPopularity() {
    var groupedTrackIds = chunkID(trackID, 49);
    request.post(authOptions, function (error, response, body) {
      for (var tID = 0; tID < 1; tID++) {
        if (!error && response.statusCode === 200) {
          var token = body.access_token;
          var options = {
            url: `https://api.spotify.com/v1/tracks/?ids=${groupedTrackIds[tID].join(",")}`,
            headers: {
              'Authorization': 'Bearer ' + token
            },
            json: true
          };

          request.get(options, function (error, response, body) {
            if (!error && response.statusCode === 200) {
              for (var i = 0; i < body.tracks.length; i++) {
                var trackName = body.tracks[i].name;
                var trackPopularity = body.tracks[i].popularity;

                if (!(trackNameAndView.items.some(item => item.name == trackName)))
                  trackNameAndView.items.push(makeCustomTrackFormat(trackName, trackPopularity));
              }
            } else {
              console.log("Get Track Names and Pop Error: " + error + " " + JSON.stringify(response, null, 4));
            }
          });
        } else {
          console.log("Post Track Name and Pop Error: " + error + " " + JSON.stringify(response, null, 4));
        }
      }
    });
  }

  function sleep(millis) {
    return new Promise(resolve => setTimeout(resolve, millis));
  }

  getAlbums();

  getArtist();

  http.createServer(function (request, response) {
    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8"
    });

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