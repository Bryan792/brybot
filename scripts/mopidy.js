var Mopidy, mopidy, online;

Mopidy = require("mopidy");

mopidy = new Mopidy({
  webSocketUrl: 'ws://localhost:6680/mopidy/ws/'
});

online = false;

mopidy.on('state:online', function() {
  return online = true;
});

mopidy.on('state:offline', function() {
  return online = false;
});

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
    var findCurrentTrack;
    var printNextTrack;

    if (online) {
      findCurrentTrack = function(Tltrack) {
        if (Tltrack) {
          return mopidy.tracklist.eotTrack(Tltrack).done(printNextTrack, console.error.bind(console));
        } else {
          return message.send("No next song");
        }
      };

      printNextTrack = function(Tltrack) {
        if (Tltrack) {
          return message.send("Next track: " + constructTrackDesc(Tltrack.track));
        } else {
          return message.send("No next song");
        }
      };

    } else {
      message.send('Mopidy is offline');
    }
    return mopidy.playback.getCurrentTlTrack().done(findCurrentTrack, console.error.bind(console));
  });

  robot.respond(/next track/i, function(message) {
    var printCurrentTrack;
    if (online) {
      mopidy.playback.next();
      printCurrentTrack = function(track) {
        if (track) {
          return message.send("Now playing: " + constructTrackDesc(track));
        } else {
          return message.send("No track is playing");
        }
      };
    } else {
      message.send('Mopidy is offline');
    }
    return mopidy.playback.getCurrentTrack().then(printCurrentTrack, console.error.bind(console));
  });

  robot.respond(/mute/i, function(message) {
    if (online) {
      mopidy.playback.setMute(true);
      return message.send('Playback muted');
    } else {
      return message.send('Mopidy is offline');
    }
  });

  robot.respond(/unmute/i, function(message) {
    if (online) {
      mopidy.playback.setMute(false);
      return message.send('Playback unmuted');
    } else {
      return message.send('Mopidy is offline');
    }
  });

  robot.respond(/pause music/i, function(message) {
    if (online) {
      mopidy.playback.pause();
      return message.send('Music paused');
    } else {
      return message.send('Mopidy is offline');
    }
  });

  robot.respond(/resume music/i, function(message) {
    if (online) {
      mopidy.playback.resume();
      return message.send('Music resumed');
    } else {
      return message.send('Mopidy is offline');
    }
  });

  robot.respond(/shuffle music/i, function(message) {
    if (online) {
      mopidy.tracklist.setRandom(true);
      return message.send('Now shuffling');
    } else {
      return message.send('Mopidy is offline');
    }
  });

  robot.respond(/stop shuffle/i, function(message) {
    if (online) {
      mopidy.tracklist.setRandom(false);
      return message.send('Shuffling has been stopped');
    } else {
      return message.send('Mopidy is offline');
    }
  });

  robot.respond(/search (.*)/i, function(message) {
    if (online) {
      var query = message.match[1];
      mopidy.library.search({
        'any': [query]
      }).then(function(data) {
        var track = data[0].tracks[0];
        console.log(data);
        mopidy.tracklist.add([track]).then(function(data) {
          console.log(data);
          mopidy.playback.play(data[0]);
        });
        return message.send("https://www.youtube.com/watch?v=" + data[0].tracks[0].comment);
      });
    } else {
      return message.send('Mopidy is offline');
    }
  });

  var constructTrackDesc = function(track) {
    var desc = "";
    if (track.name) desc += track.name;
    if (track.artists && track.artists[0].name) desc += " by " + track.artists[0].name;
    return desc;
  }
};
