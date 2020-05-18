  var request = require('request');
  var http = require("http");
  var artistID = "6yhD1KjhLxIETFF7vIRf8B";
  var albumID = [];
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

  const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));

  function getAlbums(_callback) {
    request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        var token = body.access_token;
        var options = {
          url: `https://api.spotify.com/v1/artists/${artistID}/albums`,
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
          } else {
            console.log("Get Album Error: " + error + " " + JSON.stringify(response, null, 4));
          }
          getAlbumTracks();
        });
      }
    });
    _callback();
  }

  function getAlbumTracks() {
    request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        var token = body.access_token;

        for (const iID in albumID) {
          var options = {
            url: `https://api.spotify.com/v1/albums/${albumID[iID]}/tracks`,
            headers: {
              'Authorization': 'Bearer ' + token
            },
            json: true
          };
          request.get(options, function (error, response, body) {
            if (!error && response.statusCode === 200) {
              for (let i = 0; i < body.items.length; i++) {
                getTrackNameAndPopularity(body.items[i].id);
              }
            } else {
              console.log("Get Album Tracks Error: " + error + " " + JSON.stringify(response, null, 4));
            }
          });
        }
      }
    });
  }

  function getTrackNameAndPopularity(individualID) {
    request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        var token = body.access_token;
        var options = {
          url: `https://api.spotify.com/v1/tracks/${individualID}`,
          headers: {
            'Authorization': 'Bearer ' + token
          },
          json: true
        };
        request.get(options, function (error, response, body) {
          if (!error && response.statusCode === 200) {
            if (!(trackNameAndView.items.some(item => item.name == body.name)))
              trackNameAndView.items.push(makeCustomTrackFormat(body.name, body.popularity));
          } else {
            console.log("Get Track Names and Pop Error: " + error + " " + JSON.stringify(response, null, 4));
          }
        });
      }
    });
  }

  getAlbums(function () {
    console.log("Done");
  });

  http.createServer(function (request, response) {

    console.log(trackNameAndView);

    trackNameAndView.items.sort(function (a, b) {
      return b.popularity - a.popularity
    });

    response.writeHead(200, {
      "Content-Type": "text/html"
    });
    response.write(`<span id="testID">${JSON.stringify(trackNameAndView, null, 4)}</span> dnasdnasnda ${trackNameAndView.items.length}`);
    response.end();

  }).listen(8888);