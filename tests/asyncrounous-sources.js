describe('asyncrounous sources', function() {
  var dataRequest, promise, resolve, reject
  typicalAsyncTest = function() {
    promise = new Promise(function(res, rej) {
      resolve = res; reject = rej
    })
    dataRequest = sinon.spy(function() {
      return promise
    })

    testEl = document.createElement('div')
    testEl.innerHTML = '<aside class="search"><input type="text" data-bind="value: searchTerm, valueUpdate: \'input\'"></aside>\
      <frypan params="columns: columns, data: data, loadingHtml: loadingHtml, searchTerm: searchTerm"></frypan>'
    document.body.appendChild(testEl)

    ko.applyBindings({
      searchTerm: ko.observable(),
      columns: [{
        text: 'fruit'
      }],
      loadingHtml: '<p>loading...</p>',
      data: dataRequest
    }, testEl)
  }

  it('should render data resolved by the promise', function() {
    typicalAsyncTest()
    resolve(fruits)

    return promise.then(function() {
      dataRequest.should.have.been.calledOnce
      textNodesFor('tbody tr td').should.deep.equal(['apple', 'banana'])
    })
  })

  it('should show allow custom loading html', function() {
    typicalAsyncTest()

    textNodesFor('tbody tr td').should.be.empty
    testEl.querySelector('div.frypan-loading').style.display.should.equal('')
    testEl.querySelector('.frypan-loading p').textContent.should.equal('loading...')
  })

  it('should show a loading div while data is loading', function() {
    typicalAsyncTest()

    textNodesFor('tbody tr td').should.be.empty
    testEl.querySelector('div.frypan-loading').style.display.should.equal('')

    resolve(fruits)

    return promise.then(function() {
      dataRequest.should.have.been.calledOnce
      textNodesFor('tbody tr td').should.deep.equal(['apple', 'banana'])
      testEl.querySelector('div.frypan-loading').style.display.should.equal('none')
    })
  })

  it('should provide search criteria to the data function', function() {
    promise = new Promise(function(res, rej) {
      resolve = res; reject = rej
    })
    dataRequest = sinon.spy(function() {
      return promise
    })

    testSetup('columns: columns, data: data, searchTerm: searchTerm, sortColumn: sortColumn', {
      columns: [{
        text: 'fruit'
      }, {
        text: 'needsPeeling'
      }, {
        text: 'color',
        filterOptions: ['red', 'yellow']
      }],
      searchTerm: ko.observable('ppl'),
      sortColumn: ko.observable(1),

      data: dataRequest
    })

    dataRequest.should.have.been.calledOnce.and.deep.calledWith({
      searchTerm: 'ppl',
      sortColumn: 1,
      sortAscending: true,
      filters: [null, null, null],
      skip: 0
    })

    resolve(fruits)
    return promise.then(function() {
      filterOn(2, 1)
      dataRequest.should.have.been.calledTwice.and.deep.calledWith({
        searchTerm: 'ppl',
        sortColumn: 1,
        sortAscending: true,
        filters: [null, null, ['yellow']],
        skip: 0
      })
    })
  })

  it('should not attempt to refilter the data from the server', function() {
    promise = new Promise(function(res, rej) {
      resolve = res; reject = rej
    })
    dataRequest = sinon.spy(function() {
      return promise
    })

    testSetup('columns: columns, data: data', {
      columns: [{
        text: 'fruit'
      }, {
        text: 'needsPeeling',
        filterOptions: ['old', 'young']
      }, {
        text: 'color',
        filterOptions: ['red', 'yellow']
      }],

      data: dataRequest
    })

    filterOn(1, 1)
    resolve([{
      fruit: 'banana',
      needsPeeling: true,
      color: 'yellow'
    }])

    return promise.then(function() {
      textNodesFor('tbody tr td:nth-child(2)').should.deep.equal(['true'])
    })
  })

  it('should show a loading div on top of the previous data while another request is in progress', function() {
    typicalAsyncTest()
    resolve(fruits)
    return promise.then(function() {
      promise = new Promise(function(res, rej) {
        resolve = res; reject = rej
      })

      searchFor('bana')
      textNodesFor('tbody tr td').should.deep.equal(['apple', 'banana'])
      testEl.querySelector('div.frypan-loading').style.display.should.equal('')
      dataRequest.should.have.been.calledTwice

      resolve([{
        fruit: 'banana',
        needsPeeling: 31
      }])
      return promise.then(function() {
        textNodesFor('tbody tr td').should.deep.equal(['banana'])
        testEl.querySelector('div.frypan-loading').style.display.should.equal('none')
      })
    })
  })

  it('should hide the loading div even when the request fails')

  it('should only have one request in flight at a time', function() {
    typicalAsyncTest()
    dataRequest.should.have.been.calledOnce

    searchFor('bana')
    dataRequest.should.have.been.calledOnce
    textNodesFor('tbody tr td').should.be.empty

    click('thead th:first-of-type a')
    dataRequest.should.have.been.calledOnce
  })

  it('should submit a pending request right after the current one succeeds', function() {
    typicalAsyncTest()
    dataRequest.should.have.been.calledOnce
    testEl.querySelector('div.frypan-loading').style.display.should.equal('')

    searchFor('bana')
    dataRequest.should.have.been.calledOnce
    testEl.querySelector('div.frypan-loading').style.display.should.equal('')

    var firstResolve = resolve, firstPromise = promise
    promise = new Promise(function(res, rej) {
      resolve = res; reject = rej
    })
    firstResolve(fruits)
    return firstPromise.then(function() {
      clock.tick(20)
      dataRequest.should.have.been.calledTwice
      textNodesFor('tbody tr td').should.deep.equal(['apple', 'banana'])
      testEl.querySelector('div.frypan-loading').style.display.should.equal('')
    })
  })

  it('should not fire another request if the criteria did not change', function() {
    typicalAsyncTest()
    dataRequest.should.have.been.calledOnce

    searchFor('bana')
    dataRequest.should.have.been.calledOnce

    var firstResolve = resolve, firstPromise = promise
    promise = new Promise(function(res, rej) {
      resolve = res; reject = rej
    })
    firstResolve(fruits)
    return firstPromise.then(function() {
      clock.tick(20)
      dataRequest.should.have.been.calledTwice
      testEl.querySelector('div.frypan-loading').style.display.should.equal('')

      resolve(fruits)
      return promise.then(function() {
        dataRequest.should.have.been.calledTwice
        testEl.querySelector('div.frypan-loading').style.display.should.equal('none')
      })
    })
  })

  describe('infinite scroll', function() {
    var scrollArea
    before(function() {
      // inifite scroll requires virtualization
      document.styleSheets[0].insertRule('frypan { display: block; width: 300px; height: 200px; overflow: auto }', 1);
    })
    beforeEach(function() {
      clock.restore()
      clock = null
      addFruits(100)

      typicalAsyncTest()
      scrollArea = testEl.querySelector('.frypan-scroll-area')
      dataRequest.should.have.been.calledOnce
      resolve(fruits)
      promise = new Promise(function(res, rej) {
        resolve = res; reject = rej
      })

      return pollUntilPassing(function() {
        scrollArea.scrollHeight.should.be.above(1000)
      })
    })
    after(function() {
      document.styleSheets[0].deleteRule(1)
    })

    it('should not send another request while scrolling in the middle of data', function() {
      scrollArea.scrollTop = 320

      return pollUntilPassing(function() {
        scrollArea.scrollTop.should.equal(320)
        dataRequest.should.have.been.calledOnce
        dataRequest.should.have.been.deep.calledWith({
          searchTerm: undefined,
          sortColumn: undefined,
          sortAscending: true,
          filters: [null],
          skip: 0
        })
      })
    })

    it('should send a request for more data while scrolling to the end', function() {
      scrollArea.scrollTop = scrollArea.scrollHeight - scrollArea.offsetHeight * 1.1

      return pollUntilPassing(function() {
        dataRequest.should.have.been.calledTwice
        dataRequest.should.have.been.deep.calledWith({
          searchTerm: undefined,
          sortColumn: undefined,
          sortAscending: true,
          filters: [null],
          skip: 102
        })
      })
    })

    it('should append the new items to the end', function() {
      var originalScrollHeight = scrollArea.scrollHeight
      scrollArea.scrollTop = scrollArea.scrollHeight - scrollArea.offsetHeight
      resolve([{
        fruit: 'guava',
        color: 'green'
      }, {
        fruit: 'passion fruit',
        color: 'crimson'
      }])

      return pollUntilPassing(function() {
        scrollArea.scrollHeight.should.be.above(originalScrollHeight + 20)
      }).then(function() {
        scrollArea.scrollTop = scrollArea.scrollHeight - scrollArea.offsetHeight
      }).then(function() {
        return pollUntilPassing(function() {
          testEl.querySelectorAll('tbody tr').length.should.be.above(7)
          textNodesFor('tbody tr:last-child td').should.deep.equal(['passion fruit'])
        })
      })
    })

    it('should reset the skip level when the criteria changes', function() {
      scrollArea.scrollTop = scrollArea.scrollHeight - scrollArea.offsetHeight * 1.2
      resolve([{
        fruit: 'passion fruit',
        color: 'crimson'
      }])
      promise.then(function() {
        promise = new Promise(function(res) {
          resolve = res
        })
      })

      return pollUntilPassing(function() {
        dataRequest.should.have.been.calledTwice
        dataRequest.lastCall.args[0].skip.should.equal(102)
        should.not.exist(dataRequest.lastCall.args[0].searchTerm)
        scrollArea.scrollTop.should.be.above(scrollArea.scrollHeight - scrollArea.offsetHeight * 2)
      }).then(function() {
        resolve([{
          fruit: 'guava',
          color: 'green'
        }])
        searchFor('uava')
      }).then(function() {
        return pollUntilPassing(function() {
          dataRequest.should.have.been.calledThrice
          textNodesFor('tbody td').should.deep.equal(['guava'])
          scrollArea.scrollTop.should.equal(0)
        })
      })
    })

    // oddly this test is only stable in PhantomJS
    it('should serialize requests, including with criteria changes', 'callPhantom' in window && function() {
      scrollArea.scrollTop = scrollArea.scrollHeight - scrollArea.offsetHeight * 1.2
      setTimeout(function() {
        searchFor('uava')
      }, 20)

      return pollUntilPassing(function() {
        dataRequest.should.have.been.calledTwice
        dataRequest.lastCall.args[0].skip.should.equal(102)
        should.not.exist(dataRequest.lastCall.args[0].searchTerm)
        dataRequest.lastCall.args[0].skip.should.equal(102)
      }).then(function() {
        resolve([{
          fruit: 'guava',
          color: 'green'
        }])
      }).then(function() {
        return pollUntilPassing(function() {
          dataRequest.should.have.been.calledThrice
        })
      })
    })

    it('should stop requesting more data when no more items are recieved', function() {
      scrollArea.scrollTop = scrollArea.scrollHeight - scrollArea.offsetHeight * 1.2
      resolve([])

      return pollUntilPassing(function() {
        dataRequest.should.have.been.calledTwice
      }).then(function() {
        scrollArea.scrollTop = scrollArea.scrollHeight - scrollArea.offsetHeight * 1.05
      }).then(function() {
        return pollUntilPassing(function() {
          dataRequest.should.have.been.calledTwice
        })
      })
    })
  })
})
