  var request = require('request');
  var http = require("http");
  var artistID = "1McMsnEElThX1knmY4oliG";
  var artistName = "";
  var trackNameAndView = {
    "items": []
  };

  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: {
      'Authorization': 'Basic ' + (new Buffer.from(process.env.CLIENT_ID + ':' + process.env.CLIENT_SECRET).toString('base64'))
    },
    form: {
      grant_type: 'client_credentials'
    },
    json: true
  };

  //Troubleshooting Function
  // getSong();
  function getSong() {
    request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        var token = body.access_token;
        var options = {
          url: `https://api.spotify.com/v1/tracks/?ids=5tQajsiRlvDBfvrW31RMgA`,
          headers: {
            'Authorization': 'Bearer ' + token
          },
          json: true
        };
        request.get(options, function (error, response, body) {
          if (!error && response.statusCode === 200) {
            console.log(JSON.stringify(body, null, 4));
          }
        });
      }
    });
  }

  function makeCustomTrackFormat(trackInfo) {
    var idSTR = "";
    trackInfo.forEach(function (item, i) {
      if (isProperSong(item.name)) idSTR += item.id + ",";
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
              if (trackNameAndView.items.some(myItem => myItem.name == item.name)) {
                var strTitles = [];
                trackNameAndView.items.forEach(function (itemObj, i) {
                  strTitles.push(itemObj.name);
                });

                var indexOfPrevEntry = strTitles.indexOf(item.name);

                if (trackNameAndView.items[indexOfPrevEntry].popularity < item.popularity) {
                  trackNameAndView.items[indexOfPrevEntry] = {
                    name: item.name,
                    popularity: item.popularity
                  };
                }
              } else {
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

  function isProperSong(track) {
    var song = track.toString()
    return !(song.includes("Commentary") || song.includes("Karaoke") || song.includes("Voice Memo"));
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

  function getAlbums(offset) {
    request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        var token = body.access_token;
        var options = {
          url: `https://api.spotify.com/v1/artists/${artistID}/albums?include_groups=album,single,compilation,appears_on&country=CA&limit=50&offset=${50 * offset}`,
          headers: {
            'Authorization': 'Bearer ' + token
          },
          json: true
        };

        request.get(options, function (error, response, body) {
          if (!error && response.statusCode === 200) {
            body.items.forEach(function (item, i) {
              if (item.album_group == "appears_on") {
                if (item.album_type == "single") {
                  var isLast = i == body.items.length - 1;
                  getAlbumTracks(item.id, isLast);
                }
              } else {
                var isLast = i == body.items.length - 1;
                getAlbumTracks(item.id, isLast);
              }
            });
          } else {
            console.log("Get Album Error: " + error + " " + JSON.stringify(response, null, 4));
          }
        });

      } else {
        console.log("Post Albums Error: " + error + " " + JSON.stringify(response, null, 4));
      }
    });
    if (offset == 0) {
      getAlbums(1);
    }
  }

  var albumTracksIDs = [];

  function getAlbumTracks(aID, last) {
    request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        var token = body.access_token;
        var options = {
          url: `https://api.spotify.com/v1/albums/${aID}/tracks?limit=50&country=CA`,
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

            if (albumTracksIDs.length > 30 || last) {
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

  getAlbums(0);

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