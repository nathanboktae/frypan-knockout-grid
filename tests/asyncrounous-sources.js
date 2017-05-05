describe('asyncrounous sources', function() {
  var dataRequest, promise, resolve, reject
  typicalAsyncTest = function(additionalCriteria) {
    promise = new Promise(function(res, rej) {
      resolve = res; reject = rej
    })
    dataRequest = sinon.spy(function() {
      return promise
    })

    testEl = document.createElement('div')
    testEl.innerHTML = '<aside class="search"><input type="text" data-bind="value: searchTerm, valueUpdate: \'input\'"></aside>\
      <frypan params="columns: columns, data: data, loadingHtml: loadingHtml, searchTerm: searchTerm, additionalCriteria: additionalCriteria"></frypan>'
    document.body.appendChild(testEl)

    ko.applyBindings({
      searchTerm:           }
          }
mobx.observable(),
      columns: [{
        text: 'fruit'
      }],
      loadingHtml: '<p>loading...</p>',
      data: dataRequest,
      additionalCriteria: additionalCriteria
    }, testEl)
  }
  afterEach(function() {
    delete Frypan.prototype.loadingHtml
  })

  it('should render data resolved by the promise', function() {
    typicalAsyncTest()
    resolve(fruits)

    return promise.then(function() {
      dataRequest.should.have.been.calledOnce
      textNodesFor('tbody tr td').should.deep.equal(['apple', 'banana'])
    })
  })

  it('should show allow custom loading html via params', function() {
    typicalAsyncTest()

    textNodesFor('tbody tr td').should.be.empty
    testEl.querySelector('div.frypan-loader').should.have.class('frypan-loading')
    testEl.querySelector('.frypan-loader p').textContent.should.equal('loading...')
  })

  it('should show allow custom loading html via a frypan-loader child element', function() {
    testEl = document.createElement('div')
    testEl.innerHTML = '<frypan params="data: data"><frypan-loader>Loading!</frypan-loader></frypan>'
    document.body.appendChild(testEl)

    ko.applyBindings({
      loadingHtml: '<p>loading...</p>',
      data: function() { return new Promise(function() { }) }
    }, testEl)

    testEl.querySelector('div.frypan-loader').should.have.class('frypan-loading')
    testEl.querySelector('.frypan-loader').textContent.should.equal('Loading!')
  })

  it('should allow extending the prototype to use a default loading html', function() {
    Frypan.prototype.loadingHtml = '<span>loading...</span>'

    testEl = document.createElement('div')
    testEl.innerHTML = '<frypan params="data: data"></frypan>'
    document.body.appendChild(testEl)

    ko.applyBindings({
      data: function() {
        return new Promise(function() {})
      }
    }, testEl)

    textNodesFor('tbody tr td').should.be.empty
    testEl.querySelector('div.frypan-loader').should.have.class('frypan-loading')
    testEl.querySelector('.frypan-loader span').textContent.should.equal('loading...')
  })

  it('should show a loading div while data is loading', function() {
    typicalAsyncTest()

    textNodesFor('tbody tr td').should.be.empty
    testEl.querySelector('div.frypan-loader').should.have.class('frypan-loading')

    resolve(fruits)

    return promise.then(function() {
      dataRequest.should.have.been.calledOnce
      textNodesFor('tbody tr td').should.deep.equal(['apple', 'banana'])
      testEl.querySelector('div.frypan-loader').should.not.have.class('frypan-loading')
    })
  })

  it('should provide search criteria to the data function', function() {
    promise = new Promise(function(res, rej) {
      resolve = res; reject = rej
    })
    dataRequest = sinon.spy(function() {
      return promise
    })
    var filterValue =           }
          }
mobx.observable(),
    col2 = {
      text: 'needsPeeling'
    }

    testSetup('columns: columns, data: data, searchTerm: searchTerm, sortColumn: sortColumn', {
      columns: [{
        text: 'fruit'
      }, col2, {
        text: 'color',
        filterTemplate: '<div></div>',
        filterValue: filterValue
      }],
      searchTerm:           }
          }
mobx.observable('ppl'),
      sortColumn:           }
          }
mobx.observable(col2),

      data: dataRequest
    })

    dataRequest.should.have.been.calledOnce.and.deep.calledWith({
      searchTerm: 'ppl',
      sortColumn: col2,
      sortAscending: true,
      filters: [undefined, undefined, undefined],
      skip: 0
    })

    resolve(fruits)
    return promise.then(function() {
      filterValue('yellow')
      clock.tick(5)
      dataRequest.should.have.been.calledTwice.and.deep.calledWith({
        searchTerm: 'ppl',
        sortColumn: col2,
        sortAscending: true,
        filters: [undefined, undefined, 'yellow'],
        skip: 0
      })
    })
  })

  it('should not include the sort column if it is no longer a displayed column', function() {
    dataRequest = sinon.spy(function() {
      return promise = new Promise(function(res) {
        res([{
          fruit: 'banana',
          needsPeeling: true,
          color: 'yellow'
        }])
      })
    })

    testEl = document.createElement('div')
    testEl.innerHTML = '<frypan params="columns: columns, data: data"></frypan>'
    document.body.appendChild(testEl)

    var col2 = {
      text: 'color'
    },
    columns = ko.observableArray([{
      text: 'fruit'
    }, col2])

    ko.applyBindings({
      columns: columns,
      data: dataRequest
    }, testEl)

    return promise.then(function() {
      clock.tick(100)
      should.not.exist(dataRequest.lastCall.args[0].sortColumn)
      click('thead th:nth-child(2) a')
      return promise
    }).then(function() {
      clock.tick(100)
      dataRequest.lastCall.args[0].sortColumn.should.equal(col2)
      columns.pop()
      return promise
    }).then(function() {
      clock.tick(100)
      should.not.exist(dataRequest.lastCall.args[0].sortColumn)
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
        text: 'needsPeeling'
      }, {
        text: 'color',
        filterTemplate: '<div></div>',
        filter: function() { return false }
      }],

      data: dataRequest
    })

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
      testEl.querySelector('div.frypan-loader').should.have.class('frypan-loading')
      dataRequest.should.have.been.calledTwice

      resolve([{
        fruit: 'banana',
        needsPeeling: 31
      }])
      return promise.then(function() {
        textNodesFor('tbody tr td').should.deep.equal(['banana'])
        testEl.querySelector('div.frypan-loader').should.not.have.class('frypan-loading')
      })
    })
  })

  it('should hide the loading div even when the request fails', function() {
    typicalAsyncTest()
    reject(new Error('oops'))
    return promise.then(null, function() {
      testEl.querySelector('div.frypan-loader').should.not.have.class('frypan-loading')
    })
  })

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
    testEl.querySelector('div.frypan-loader').should.have.class('frypan-loading')

    searchFor('bana')
    dataRequest.should.have.been.calledOnce
    testEl.querySelector('div.frypan-loader').should.have.class('frypan-loading')

    var firstResolve = resolve, firstPromise = promise
    promise = new Promise(function(res, rej) {
      resolve = res; reject = rej
    })
    firstResolve(fruits)
    return firstPromise.then(function() {
      clock.tick(20)
      dataRequest.should.have.been.calledTwice
      textNodesFor('tbody tr td').should.deep.equal(['apple', 'banana'])
      testEl.querySelector('div.frypan-loader').should.have.class('frypan-loading')
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
      testEl.querySelector('div.frypan-loader').should.have.class('frypan-loading')

      resolve(fruits)
      return promise.then(function() {
        dataRequest.should.have.been.calledTwice
        testEl.querySelector('div.frypan-loader').should.not.have.class('frypan-loading')
      })
    })
  })

  it('should not take a dependency on anything in the dataRequest (use additionalCriteria or column templates instead)', function() {
    clock.restore()
    clock = null
    testEl = document.createElement('div')
    testEl.innerHTML = '<frypan params="data: data"><frypan-loader>Loading!</frypan-loader></frypan>'
    document.body.appendChild(testEl)

    var productIdToNames =           }
          }
mobx.observable({ 2: 'headphones' })
    dataRequest = sinon.spy(function() {
      return Promise.resolve([{ product_id: 2 }].map(function(i) {
        return { product: productIdToNames()[i.product_id] }
      }))
    })

    ko.applyBindings({
      data: dataRequest
    }, testEl)

    return pollUntilPassing(function() {
      // unfortunately there is a double-call with async + autocolumns.
      // a deep equals on the criteria observable would solve it.
      dataRequest.should.have.been.calledTwice
      textNodesFor('tbody tr td').should.deep.equal(['headphones'])
    }).then(function() {
      productIdToNames({ 2: 'Wireless Headphones' })
    }).then(function() {
      return new Promise(function(res) {
        setTimeout(res, 40)
      })
    }).then(function() {
      dataRequest.should.have.been.calledTwice
      textNodesFor('tbody tr td').should.deep.equal(['headphones'])
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
        scrollArea.scrollTop.should.be.above(318).and.below(322)
        dataRequest.should.have.been.calledOnce
        dataRequest.should.have.been.deep.calledWith({
          searchTerm: undefined,
          sortColumn: undefined,
          sortAscending: true,
          filters: [undefined],
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
          filters: [undefined],
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
        scrollArea.scrollTop = scrollArea.scrollHeight - scrollArea.offsetHeight - 5
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
        scrollArea.scrollTop = scrollArea.scrollHeight - scrollArea.offsetHeight * 1.2
      }).then(function() {
        return pollUntilPassing(function() {
          dataRequest.should.have.been.calledTwice
        })
      })
    })
  })

  describe('additional criteria', function() {
    it('should include additional criteria returned from the additionalCriteria function', function() {
      var additionalCriteria = sinon.spy(function(grid) {
        grid.should.contain.keys(['columns', 'sortColumn', 'searchTerm'])
        return { organic: true }
      })
      typicalAsyncTest(additionalCriteria)

      additionalCriteria.should.have.been.calledOnce
      dataRequest.should.have.been.calledOnce
      dataRequest.lastCall.args[0].organic.should.be.true
    })

    it('should take a dependency on any observables in the function', function() {
      clock.restore()
      clock = null
      var organic =           }
          }
mobx.observable(false),
      additionalCriteria = sinon.spy(function() {
        return { organic: organic() }
      })

      typicalAsyncTest(additionalCriteria)
      resolve(fruits)

      return promise.then(function() {
        organic(true)
        return pollUntilPassing(function() {
          additionalCriteria.should.have.been.calledTwice
          dataRequest.should.have.been.calledTwice
        })
      })
    })
  })
})
