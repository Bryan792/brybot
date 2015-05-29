# Description:
#   When asked, tells users about the current Heroes of the Storm rotation.
#   Will eventually learn to tell users about their MMR and other data tracked
#   at hotslogs.com.
#
# Dependencies:
#   "cheerio": "^0.19.0"
#   "request": "^2.55.0"
#
# Commands:
#   hubot hots rotation - fetches the current rotation
#   hubot hots mmr (number) - fetches the MMR of the given player ID
#
# Author:
#   frio

cheerio = require 'cheerio'
request = require 'request'
_       = require 'lodash'

module.exports = (robot) ->

  robot.respond /hots rotation/i, (robotResponse) ->

    request 'http://heroesofthestorm.github.io/free-hero-rotation', (err, httpResponse, body) ->

        if err
          robot.logger.error err
          robotResponse.send 'I\'m sorry, something went wrong :('
          return

        $ = cheerio.load body

        validFor = $ 'h2'
          .first()
          .text()

        # Adapted from https://github.com/chadrien/hots-irc-bot
        heroes = $ 'button.btn:not(.dropdown-toggle)'
          .map (i, e) -> e.children[0].data
          .slice 0, 7
          .get()

        robotResponse.send "#{ validFor }: #{ heroes.join ', ' }"

  robot.respond /hots mmr (\d+)/i, (robotResponse) ->

    id = robotResponse.match[1]

    request "https://www.hotslogs.com/API/Players/#{id}", (err, httpResponse, body) ->

      if err
        robot.logger.error err
        robotResponse.send 'I\'m sorry, something went wrong :('
        return

      stats = JSON.parse body

      name = stats.Name
      mmrs = _.map stats.LeaderboardRankings, (val) ->
        return "#{ val.CurrentMMR } (#{ val.GameMode })"

      robotResponse.send "#{ name }: #{ mmrs.join ', ' }"
