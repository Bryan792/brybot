# As yet, these tests don't do anything particularly useful.  These are here now
# so I can play with travis for auto-deploy.

chai = require 'chai'
expect = chai.expect

describe 'The number 1', ->
    it 'should equal 1', ->
        expect(1).to.equal(1)
