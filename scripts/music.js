// Description:
//   Mopidy interactions
//
// Dependencies:
//
// Commands:
//   hubot next - skips to the next song
//   hubot yt <query> - plays the first youtube video found
//   hubot yq <query> - puts the first youtube video found next in the tracklist
//
// Author:
//   bryan792

var filesystem = require('fs');
var ytdl = require('ytdl-core');
var jsmediatags = require("jsmediatags");
var rp = require('request-promise');

module.exports = function(robot) {

  var connection;
  var refreshIntervalId = setInterval(() => {
    connection = robot.adapter.client.internal.voiceConnection;
    if (connection) {
      onSongEnd();
      clearInterval(refreshIntervalId);
    }
  }, 5000);

  var shouldContinue = true;
  var queue = [];
  var nowPlaying = null;

  fileDir = "/mnt/hgfs/4tb/Korean/";
  files = filesystem.readdirSync(fileDir);

  function playNextFile() {
    var file;
    file = fileDir + files[Math.floor(Math.random() * files.length)];
    jsmediatags.read(file, {
      onSuccess: function(tag) {
        nowPlaying = tag.tags.artist + " - " + tag.tags.title;
        robot.adapter.setStatus(nowPlaying);
      },
      onError: function(error) {
        console.log(':(', error.type, error.info);
      }
    });
    return connection.playFile(file, {
      volume: '0.2'
    }).then((intent) => {
      intent.on("end", () => {
        onSongEnd();
      });
    });
  };

  function playNextYoutube() {
    var video = queue.shift();
    nowPlaying = video.info.title;
    robot.adapter.setStatus(nowPlaying);
    return connection.playRawStream(video.stream).then((intent) => {
      intent.on("end", () => {
        onSongEnd();
      });
    });
  };

  function onSongEnd() {
    if (shouldContinue) {
      if (queue.length > 0) {
        playNextYoutube();
      } else {
        playNextFile();
      }
    } else {
      nowPlaying = null;
      robot.adapter.setStatus(nowPlaying);
    }
  }

  robot.respond(/What's Playing/i, function(message) {
    message.reply(nowPlaying);
  });

  robot.respond(/play/i, function(message) {
    if (connection) {
      shouldContinue = true;
      onSongEnd();
    }
  });

  robot.respond(/next/i, function(message) {
    if (connection) {
      shouldContinue = true;
      connection.stopPlaying();
    }
  });

  robot.respond(/stop/i, function(message) {
    if (connection) {
      shouldContinue = false;
      connection.stopPlaying();
    }
  });

  function addYoutubeVideo(message, videoId) {
    var requestUrl = 'http://www.youtube.com/watch?v=' + videoId;
    ytdl.getInfo(requestUrl, (err, info) => {
      if (err) console.log(err);
      else {
        var stream = ytdl.downloadFromInfo(info, {
          filter: (format) => format.container === 'mp4',
          quality: 'lowest',
        });
        var position = queue.push({
          "info": info,
          "stream": stream
        });
        return message.reply("Queueing into position " + position + " : " + info.title + " " + requestUrl);
      }
    });
  }

  robot.respond(/yt (.*)/, function(message) {
    if (connection) {
      shouldContinue = true;
      var videoId = message.match[1];
      addYoutubeVideo(message, videoId);
    }
  });

  robot.respond(/yq (.*)/, function(message) {
    if (connection) {
      shouldContinue = true;
      var query = message.match[1];
      var options = {
        uri: 'https://www.googleapis.com/youtube/v3/search',
        qs: {
          part: 'snippet',
          q: escape(query),
          key: 'AIzaSyAl1Xq9DwdE_KD4AtPaE4EJl3WZe2zCqg4'
        },
        json: true // Automatically parses the JSON string in the response 
      };
      rp(options).then((response) => {
        if (response.items.length == 0) {
          message.reply('Your query gave 0 results.');
          return;
        }
        for (var item of response.items) {
          if (item.id.kind === 'youtube#video') {
            var vid = item.id.videoId;
            addYoutubeVideo(message, vid);
            return;
          }
        }
        message.reply('No video has been found!');
      }).catch(error => {
        console.log(error);
        message.reply('There was an error searching.');
        return;
      });
    }
  });

};
