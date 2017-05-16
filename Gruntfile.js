module.exports = function(grunt) {
  grunt.initConfig({
    connect: {
      server: {
        options: {
          base: '',
          port: 9999
        }
      }
    },
    'saucelabs-mocha': {
      all: {
        options: {
          urls: ['http://127.0.0.1:9999/tests/tests.html'],
          tunnelTimeout: 5,
          build: process.env.TRAVIS_JOB_ID || 0,
          concurrency: 3,
          browsers: [{
            browserName:"iphone",
            platform: "OS X 10.10",
            version: "10.2"
          }, {
            browserName:"iphone",
            platform: "OS X 10.10",
            version: "9.3"
          }, {
            browserName:"safari",
            version: "10"
          }, {
            browserName:"android",
            platform: "Linux",
            version: "5.1"
          }, {
            browserName: 'googlechrome',
            version: 'latest'
          }, {
            browserName: 'firefox',
            platform: 'WIN7',
          },{
            browserName: 'internet explorer',
            platform: 'WIN8.1',
            version: '11'
          }, {
            browserName: 'internet explorer',
            platform: 'WIN8',
            version: '10'
          }],
          testname: 'frypan-knockout-grid tests',
          tags: [process.env.TRAVIS_BRANCH || 'local']
        }
      }
    }
  })

  grunt.loadNpmTasks('grunt-saucelabs')
  grunt.loadNpmTasks('grunt-contrib-connect')

  grunt.registerTask('test', ['connect', 'saucelabs-mocha'])
}