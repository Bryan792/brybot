# Description:
#   Figure out and tell people what the current KFC deals are.
#
# Dependencies:
#   "cheerio": "^0.19.0"
#   "request": "^2.55.0"
#   "lodash": "^3.9.3"
#
# Commands:
#   hubot kfc rotation
#
# Author:
#   frio

cheerio = require 'cheerio'
request = require 'request'
_       = require 'lodash'


module.exports = (robot) ->

  robot.respond /kfc rotation/i, (robotResponse) ->

    robotResponse.reply 'Checking the KFC rotation (http://www.kfc.co.nz/coupons/)'

    request 'http://www.kfc.co.nz/coupons/', (err, httpResponse, body) ->

      if err
        robot.logger.error err
        robotResponse.send 'I\'m sorry, something went wrong :('
        return

      $ = cheerio.load body

      deals = $ 'div.coupon:not(.want-more)'
        .map (i, element) ->
          price: $(element).find('div.price').text().trim()
          name: $(element).find('div.description > h2').text().trim()
          items: $(element).find('div.description > span').text().trim().replace(/(\r\n|\n|\r)/gm, ', ')

      _ deals
        .sortBy 'price'
        .each (deal) -> robotResponse.send "#{ deal.name }: #{ deal.price } (#{ deal.items })"
        .value()
