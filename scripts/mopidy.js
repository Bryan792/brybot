// Description:
//   Mopidy interactions
//
// Dependencies:
//
// Commands:
//   hubot set volume <#> - sets the current volume
//   hubot volume? - displays the current volume
//   hubot what's playing? - displays the current song
//   hubot what's next? - displays the next song
//   hubot next track - skips to the next song
//   hubot shuffle music - shuffles the tracklist
//   hubot search <query> - plays the first youtube video found
//   hubot queue <query> - puts the first youtube video found next in the tracklist
//
// Author:
//   bryan792

var Mopidy, mopidy, online;

Mopidy = require("mopidy");

mopidy = new Mopidy({
  webSocketUrl: 'ws://localhost:6680/mopidy/ws/',
  autoConnect: false
});

online = false;

mopidy.on('state:online', function() {
  return online = true;
});

mopidy.on('state:offline', function() {
  return online = false;
});

//mopidy.on(console.log.bind(console));

module.exports = function(robot) {

  mopidy.on("event:trackPlaybackStarted", function() {
    mopidy.playback.getCurrentTrack()
      .done(function(track) {
        if (track) {
          console.log(track);
          robot.adapter.topic(null, "Currently playing: " + constructTrackDesc(track));
        }
      });
  });

  robot.respond(/set volume (\d+)/i, function(message) {
    var newVolume;
    newVolume = parseInt(message.match[1]);
    if (online) {
      mopidy.playback.setVolume(newVolume);
      return message.send("Set volume to " + newVolume);
    } else {
      return message.send('Mopidy is offline');
    }
  });

  robot.respond(/volume\?/i, function(message) {
    var printCurrentVolume;
    if (online) {
      printCurrentVolume = function(volume) {
        if (volume) {
          return message.send("The Current volume is " + volume);
        } else {
          return message.send("Sorry, can't grab current volume");
        }
      };
    } else {
      message.send('Mopidy is offline');
    }
    return mopidy.playback.getVolume().then(printCurrentVolume, console.error.bind(console));
  });

  robot.respond(/what'?s playing/i, function(message) {
    var printCurrentTrack;
    if (online) {
      printCurrentTrack = function(track) {
        if (track) {
          return message.send("Currently playing: " + constructTrackDesc(track));
        } else {
          return message.send("No track is playing");
        }
      };
    } else {
      message.send('Mopidy is offline');
    }
    return mopidy.playback.getCurrentTrack().done(printCurrentTrack, console.error.bind(console));
  });

  robot.respond(/what'?s next/i, function(message) {
    if (online) {
      var printNextTrack = function(Tltrack) {
        if (Tltrack) {
          return mopidy.tracklist.eotTrack(Tltrack).done(printTrackAsNext, console.error.bind(console));
        } else {
          //No current song
          return message.send("No next song");
        }
      };

      var printTrackAsNext = function(Tltrack) {
        if (Tltrack) {
          return message.send("Next track: " + constructTrackDesc(Tltrack.track));
        } else {
          return message.send("No next song");
        }
      };

    } else {
      message.send('Mopidy is offline');
    }
    return mopidy.playback.getCurrentTlTrack().done(printNextTrack, console.error.bind(console));
  });

  robot.respond(/next track/i, function(message) {
    var printCurrentTrack;
    if (online) {
      mopidy.playback.next().then(function(data) {
        return mopidy.playback.getCurrentTrack().then(printCurrentTrack, console.error.bind(console));
      });
      printCurrentTrack = function(track) {
        if (track) {
          return message.send("Now playing: " + constructTrackDesc(track));
        } else {
          return message.send("No track is playing");
        }
      };
    } else {
      return message.send('Mopidy is offline');
    }
  });

  robot.respond(/shuffle music/i, function(message) {
    if (online) {
      mopidy.tracklist.shuffle();
      return message.send('Now shuffling');
    } else {
      return message.send('Mopidy is offline');
    }
  });

  robot.respond(/search (.*)/i, function(message) {
    if (online) {
      var query = message.match[1];
      mopidy.library.search({
        'any': [query]
      }, ["youtube:"]).then(function(data) {
        var track = data[0].tracks[0];
        console.log(data);
        mopidy.tracklist.index().then(function(idx) {
          console.log(idx);
          mopidy.tracklist.add([track], idx + 1).then(function(data) {
            console.log(data);
            mopidy.playback.play(data[0]);
          });
        });
        return message.send("https://www.youtube.com/watch?v=" + track.comment);
      });
    } else {
      return message.send('Mopidy is offline');
    }
  });

  robot.respond(/queue (.*)/i, function(message) {
    if (online) {
      var query = message.match[1];
      mopidy.library.search({
        'any': [query]
      }, ["youtube:"]).then(function(data) {
        var track = data[0].tracks[0];
        console.log("searchresults:\n" + data);
        mopidy.tracklist.index().then(function(idx) {
          console.log(idx);
          mopidy.tracklist.add([track], idx + 1).then(function(adddata) {
            console.log(adddata);
          });
        });
        return message.send("https://www.youtube.com/watch?v=" + track.comment);
      });
    } else {
      return message.send('Mopidy is offline');
    }
  });

  var constructTrackDesc = function(track) {
    var desc = "";
    if (track.name) desc += track.name;
    if (track.artists && track.artists[0].name) desc += " by " + track.artists[0].name;
    if (track.album && track.album.name) desc += " from " + track.album.name;
    return desc;
  }
};
