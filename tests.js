/*eslint-env mocha*/
/*global ko*/
describe('Frypan grid', function() {
  var testEl, fruits, clock,
  testSetup = function(bindingString, viewModel) {
    if (!viewModel) {
      viewModel = bindingString
      bindingString = null
    }

    testEl = document.createElement('frypan')
    testEl.setAttribute('params', bindingString || 'columns: columns, data: data')
    document.body.appendChild(testEl)
    ko.applyBindings(viewModel, testEl)
  },
  textNodesFor = function(selector) {
    return Array.prototype.map.call(testEl.querySelectorAll(selector), function(el) {
      return el.textContent.trim()
    })
  },
  attributesFor = function(selector, attr) {
    return Array.prototype.map.call(testEl.querySelectorAll(selector), function(el) {
      return el.attributes[attr] && el.attributes[attr].value
    })
  },
  click = function(el) {
    var evt = document.createEvent('MouseEvents')
    evt.initEvent('click', true, true)
    if (typeof el === 'string') {
      el = document.querySelector(el)
    }
    el.dispatchEvent(evt)
  },
  searchFor = function(term) {
    var input = document.querySelector('.search input')
    input.value = term
    var evt = document.createEvent('Events')
    evt.initEvent('input', true, true)
    input.dispatchEvent(evt)
    clock && clock.tick(100)
  },
  filterOn = function(colIdx, what) {
    click('a.frypan-filter-toggle')
    click('thead th:nth-of-type(' + (colIdx + 1) + ') .frypan-filters a:nth-of-type(' + (what + 1) + ')')
    clock.tick(100)
  },
  addFruits = function(n) {
    for (var i = 0; i < n; i++) {
      fruits.push({
        fruit: ['apple', 'pear', 'banana', 'kiwi', 'strawberry', 'watermelon', 'peach', 'pineapple'][(Math.random() * 8) >> 0],
        color: ['red', 'orange', 'yellow', 'green', 'pink'][(Math.random() * 5) >> 0],
        needsPeeling: [true, false, 'maybe'][(Math.random() * 3) >> 0]
      })
    }
  }

  // normalize td size so tests we can assert exact numbers in tests
  document.styleSheets[0].insertRule('td { line-height: 18px; }', 2);

  beforeEach(function() {
    fruits = [{
      fruit: 'apple',
      needsPeeling: 'optional',
      color: 'red'
    }, {
      fruit: 'banana',
      needsPeeling: true,
      color: 'yellow'
    }]
    clock = sinon.useFakeTimers()
    localStorage.removeItem('fruits')
  })
  afterEach(function() {
    testEl && document.body.removeChild(testEl)
    testEl = null
    clock && clock.restore()
  })

  describe('text', function() {
    it('should render the property of the row item if a string', function() {
      testSetup({
        columns: [{
          text: 'fruit'
        }],
        data: fruits
      })

      textNodesFor('tbody tr td').should.deep.equal(['apple', 'banana'])
    })

    it('should render the data if the source is an observable', function() {
      fruits = ko.observableArray(fruits)
      testSetup('data: data', {
        data: fruits
      })

      textNodesFor('tbody tr td').should.deep.equal(['apple', 'optional', 'red', 'banana', 'true', 'yellow'])

      fruits.push({
        fruit: 'kiwi',
        needsPeeling: true,
        color: 'green'
      })
      clock.tick(60)

      textNodesFor('tbody tr td').should.deep.equal(['apple', 'optional', 'red', 'banana', 'true', 'yellow', 'kiwi', 'true', 'green'])
    })

    it('should render the result of the function called with item and row index', function() {
      testSetup({
        columns: [{
          text: function(item, rowIdx) {
            return rowIdx + ': ' + item.fruit + (item.needsPeeling === true ? 's need peeling' : 's do not need peeling')
          }
        }],
        data: fruits
      })

      textNodesFor('tbody tr td').should.deep.equal(['0: apples do not need peeling', '1: bananas need peeling'])
    })

    it('should be able to provide a custom template', function() {
      testSetup({
        columns: [{
          template: '<dl><dt data-bind="text: $data.fruit"></dt><dd data-bind="text: $data.color"></dd></dl>'
        }],
        data: fruits
      })

      textNodesFor('tbody td dt').should.deep.equal(['apple', 'banana'])
      textNodesFor('tbody td dd').should.deep.equal(['red', 'yellow'])
    })
  })

  describe('class', function() {
    it('should add the class directly if a string or observable of a string', function() {
      testSetup({
        columns: [{
          class: ko.observable('fruits')
        }],
        data: fruits
      })

      testEl.querySelector('tbody td > span').className.should.equal('fruits')
    })

    it('should add the class(es) for header columns, where item and rowIdx are not available', function() {
      testSetup({
        columns: [{
          class: function(item, rowIdx) {
            if (!item && rowIdx == null) {
              return 'header-class'
            }
          }
        }],
        data: fruits
      })

      attributesFor('thead th', 'class').should.deep.equal(['header-class'])
    })

    it('should add the class(es) of the result of a function called with item and row index', function() {
      testSetup({
        columns: [{
          class: function(item, rowIdx) {
            if (item) {
              return rowIdx + '-' + item.fruit + '-' + item.needsPeeling
            }
          }
        }],
        data: fruits
      })

      testEl.querySelector('tbody tr:first-child span').className.should.equal('0-apple-optional')
    })
  })

  describe('link', function() {
    it('should render an a tag wrapping the text span if provided as a string', function() {
      testSetup({
        columns: [{
          link: '/details',
          text: 'fruit'
        }],
        data: fruits
      })

      attributesFor('tbody td > a', 'href').should.deep.equal(['/details', '/details'])
      textNodesFor('tbody td > a > span').should.deep.equal(['apple', 'banana'])
    })

    it('should render the result of a function called with item and row index', function() {
      testSetup({
        columns: [{
          link: function(item, rowIdx) {
            return '/details/' + item.fruit + '?idx=' + rowIdx
          },
          text: 'fruit'
        }],
        data: fruits
      })

      attributesFor('tbody td > a', 'href').should.deep.equal([
        '/details/apple?idx=0',
        '/details/banana?idx=1'
      ])
    })

    it('should render class attributes on the anchor', function() {
      testSetup({
        columns: [{
          link: function(item, rowIdx) {
            return '/details/' + item.fruit + '?idx=' + rowIdx
          },
          text: 'fruit',
          class: 'fruits'
        }],
        data: fruits
      })

      attributesFor('tbody td > a', 'class').should.deep.equal(['fruits', 'fruits'])
    })
  })

  describe('search', function() {
    var searchTestSetup = function(searchFunc) {
      testEl = document.createElement('div')
      testEl.innerHTML = '<aside class="search"><input type="text" data-bind="value: searchTerm, valueUpdate: \'input\'"></aside><frypan params="columns: columns, data: data, searchTerm: searchTerm"></frypan>'
      document.body.appendChild(testEl)

      ko.applyBindings({
        searchTerm: ko.observable(),
        data: fruits,
        columns: [{
          text: 'fruit',
          search: searchFunc
        }]
      }, testEl)
    }

    it('should substring search the text field if no search function is provided', function() {
      searchTestSetup()

      searchFor('ppl')
      textNodesFor('tbody tr td').should.deep.equal(['apple'])
    })

    it('should filter results that only match the search function', function() {
      searchTestSetup(function(item, term) {
        return item.fruit.indexOf(term) === -1
      })

      searchFor('ppl')
      textNodesFor('tbody tr td').should.deep.equal(['banana'])
    })

    it('should search case insensitively', function() {
      searchTestSetup()

      searchFor('APP')
      textNodesFor('tbody tr td').should.deep.equal(['apple'])
    })

    it('should render matching substring with an <em> tag', function() {
      searchTestSetup()

      searchFor('ppl')
      textNodesFor('tbody tr td span em').should.deep.equal(['ppl'])
    })
  })

  describe('filter', function() {
    var simpleFilterTest = function() {
      testSetup({
        columns: [{
          text: 'fruit'
        }, {
          text: 'needsPeeling'
        }, {
          text: 'color',
          filterOptions: ['red', 'yellow']
        }],
        data: fruits
      })
    }

    beforeEach(function() {
      fruits.push({
        fruit: 'strawberry',
        needsPeeling: 25,
        color: 'yellow'
      })
    })

    it('should not show filter options until clicked', function() {
      simpleFilterTest()
      testEl.querySelector('.frypan-filters').style.display.should.equal('none')
    })

    it('should only have the filtered class when there are filters', function() {
      simpleFilterTest()
      testEl.querySelector('a.frypan-filter-toggle').classList.contains('filtered').should.be.false

      filterOn(2, 1)
      testEl.querySelector('a.frypan-filter-toggle').classList.contains('filtered').should.be.true
    })

    it('should not filter anything out by default', function() {
      simpleFilterTest()

      textNodesFor('tbody td:first-child span').should.deep.equal(['apple', 'banana', 'strawberry'])
    })

    it('should by default filter on text matching any filter', function() {
      simpleFilterTest()

      filterOn(2, 1)
      textNodesFor('tbody td:first-child span').should.deep.equal(['banana', 'strawberry'])
    })

    it('should match with a custom filter function', function() {
      testSetup({
        columns: [{
          text: 'fruit'
        }, {
          text: 'needsPeeling'
        }, {
          text: 'color',
          filterOptions: ['red', 'yellow'],
          filter: function(filters, item) {
            return filters.indexOf(item.color) < 0
          }
        }],
        data: fruits
      })

      filterOn(2, 1)
      textNodesFor('tbody td:first-child span').should.deep.equal(['apple'])
    })

    it('should allow custom filter text to be supplied', function() {
      testSetup({
        columns: [{
          text: 'fruit'
        }, {
          text: 'needsPeeling'
        }, {
          text: 'color',
          filterOptions: ['red', 'yellow'],
          filterText: {
            red: 'Y',
            yellow: 'X'
          }
        }],
        data: fruits
      })

      textNodesFor('thead th:nth-child(3) .frypan-filters a').should.deep.equal(['Y', 'X'])
    })
  })

  describe('sort', function() {
    beforeEach(function() {
      fruits.unshift({
        fruit: 'grapefruit',
        needsPeeling: true,
        color: 'pink'
      })
    })

    it('should sort ascending by text field if no sort function is provided', function() {
      testSetup({
        columns: [{
          text: 'fruit'
        }, {
          text: 'needsPeeling'
        }],
        data: fruits
      })

      click('thead th:first-of-type a.frypan-sort-toggle')
      textNodesFor('tbody td:first-child span').should.deep.equal(['apple', 'banana', 'grapefruit'])
    })

    it('should sort via sort function is provided', function() {
      testSetup({
        columns: [{
          text: 'fruit'
        }, {
          text: 'color',
          sort: function(a, b) {
            return a.color < b.color ? 1 : -1
          }
        }],
        data: fruits
      })

      click('thead th:nth-of-type(2) a.frypan-sort-toggle')
      textNodesFor('tbody td:first-child span').should.deep.equal(['banana', 'apple', 'grapefruit'])
    })

    it('should sort descending if the same column is clicked again', function() {
      testSetup({
        columns: [{
          text: 'fruit'
        }, {
          text: 'needsPeeling'
        }],
        data: fruits
      })

      var colFilter = testEl.querySelector('thead th:nth-of-type(1) a.frypan-sort-toggle')
      click(colFilter)
      click(colFilter)
      textNodesFor('tbody td:first-child span').should.deep.equal(['grapefruit', 'banana', 'apple'])
    })

    it('should add a class when sorted on for the direction sorted', function() {
      testSetup({
        columns: [{
          text: 'fruit'
        }, {
          text: 'needsPeeling'
        }],
        data: fruits
      })

      var ageCol = testEl.querySelector('thead th:nth-of-type(2) a.frypan-sort-toggle')
      click(ageCol)
      attributesFor('thead th', 'aria-sort').should.deep.equal([undefined, 'ascending'])

      click(ageCol)
      attributesFor('thead th', 'aria-sort').should.deep.equal([undefined, 'descending'])
    })
  })

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
      beforeEach(function(done) {
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

        setTimeout(function() {
          scrollArea.scrollHeight.should.be.above(1000)
          done()
        }, 50)
      })
      after(function() {
        document.styleSheets[0].deleteRule(1)
      })

      it('should not send another request while scrolling in the middle of data', function(done) {
        scrollArea.scrollTop = 320

        setTimeout(function() {
          try {
            scrollArea.scrollTop.should.equal(320)
            dataRequest.should.have.been.calledOnce
            dataRequest.should.have.been.deep.calledWith({
              searchTerm: undefined,
              sortColumn: undefined,
              sortAscending: true,
              filters: [null],
              skip: 0
            })
            // The following part is too flaky
            // scrollArea.scrollTop = scrollArea.scrollHeight - scrollArea.offsetHeight * 2.2

            // setTimeout(function() {
            //   try {
            //     scrollArea.scrollTop.should.be.below(scrollArea.scrollHeight - scrollArea.offsetHeight * 2)
            //     dataRequest.should.have.been.calledOnce
            //     done()
            //   } catch(e) { done(e) }
            // }, 50)
            done()
          } catch(e) { done(e) }
        }, 50)
      })

      it('should send a request for more data while scrolling to the end', function(done) {
        scrollArea.scrollTop = scrollArea.scrollHeight - scrollArea.offsetHeight * 1.1

        setTimeout(function() {
          dataRequest.should.have.been.calledTwice
          dataRequest.should.have.been.deep.calledWith({
            searchTerm: undefined,
            sortColumn: undefined,
            sortAscending: true,
            filters: [null],
            skip: 102
          })
          done()
        }, 50)
      })

      it('should append the new items to the end', function(done) {
        scrollArea.scrollTop = scrollArea.scrollHeight - scrollArea.offsetHeight
        resolve([{
          fruit: 'guava',
          color: 'green'
        }, {
          fruit: 'passion fruit',
          color: 'crimson'
        }])

        setTimeout(function() {
          try {
            testEl.querySelectorAll('tbody tr').length.should.be.above(5)
            textNodesFor('tbody tr:last-child td').should.deep.equal(['passion fruit'])
            done()
          } catch(e) { done(e) }
        }, 200)
      })

      it('should reset the skip level when the criteria changes', function(done) {
        scrollArea.scrollTop = scrollArea.scrollHeight - scrollArea.offsetHeight * 1.2
        resolve([{
          fruit: 'passion fruit',
          color: 'crimson'
        }])
        setTimeout(function() {
          promise = new Promise(function(res) {
            resolve = res
          })
        }, 10)

        setTimeout(function() {
          dataRequest.should.have.been.calledTwice
          dataRequest.lastCall.args[0].skip.should.equal(102)
          should.not.exist(dataRequest.lastCall.args[0].searchTerm)
          scrollArea.scrollTop.should.be.above(scrollArea.scrollHeight - scrollArea.offsetHeight * 2)
          setTimeout(function() {
            resolve([{
              fruit: 'guava',
              color: 'green'
            }])
            searchFor('uava')
          }, 10)

          setTimeout(function() {
            dataRequest.should.have.been.calledThrice
            textNodesFor('tbody td').should.deep.equal(['guava'])
            scrollArea.scrollTop.should.equal(0)
            done()
          }, 200)
        }, 70)
      })

      it('should serialize requests, including with criteria changes', function(done) {
        scrollArea.scrollTop = scrollArea.scrollHeight - scrollArea.offsetHeight * 1.2
        setTimeout(function() {
          searchFor('uava')
        }, 20)

        setTimeout(function() {
          dataRequest.should.have.been.calledTwice
          dataRequest.lastCall.args[0].skip.should.equal(102)
          should.not.exist(dataRequest.lastCall.args[0].searchTerm)
          dataRequest.lastCall.args[0].skip.should.equal(102)
          setTimeout(function() {
            resolve([{
              fruit: 'guava',
              color: 'green'
            }])
          }, 5)

          setTimeout(function() {
            dataRequest.should.have.been.calledThrice
            done()  
          }, 200)
        }, 70)
      })

      it('should stop requesting more data when no more items are recieved', function(done) {
        scrollArea.scrollTop = scrollArea.scrollHeight - scrollArea.offsetHeight * 1.2
        resolve([])

        setTimeout(function() {
          dataRequest.should.have.been.calledTwice
          scrollArea.scrollTop = scrollArea.scrollHeight - scrollArea.offsetHeight * 1.05

          setTimeout(function() {
            dataRequest.should.have.been.calledTwice
            done()  
          }, 100)
        }, 50)
      })
    })
  })

  describe('saving settings', function() {
    var storageTest = function() {
      var searchTerm = ko.observable()
      testSetup('columns: columns, data: data, storageKey: \'fruits\', searchTerm: searchTerm', {
        columns: [{
          text: 'fruit'
        }, {
          text: 'needsPeeling'
        }, {
          text: 'color',
          filterOptions: ['red', 'yellow']
        }],
        searchTerm: searchTerm,
        data: fruits
      })
      return searchTerm
    }

    it('should save settings in local storage if requested', function() {
      localStorage.setItem('fruits', 'peeeeple')
      storageTest()('ppl')

      filterOn(2, 0)
      click('thead th:nth-of-type(2) a')

      JSON.parse(localStorage.getItem('fruits')).should.deep.equal({
        sortAscending: true,
        sortColumn: 1,
        showFilters: 2,
        filters: [null, null, ['red']],
        searchTerm: 'ppl'
      })
    })

    it('should load settings from local storage if requested', function() {
      localStorage.setItem('fruits', JSON.stringify({
        sortAscending: true,
        sortColumn: 1,
        showFilters: 2,
        filters: [null, null, ['yellow']],
        searchTerm: 'nan'
      }))

      storageTest()

      testEl.querySelector('a.frypan-filter-toggle').classList.contains('filtered').should.be.true
      attributesFor('thead th', 'aria-sort').should.deep.equal([undefined, 'ascending', undefined])
      textNodesFor('tbody td span em').should.deep.equal(['nan'])
    })

    it('should not load invalid column filters', function() {
      localStorage.setItem('fruits', {
        filters: [null, null, ['foobar']]
      })
      storageTest()

      textNodesFor('tbody td:first-child span').should.deep.equal(['apple', 'banana'])
    })
  })

  describe('dynamic columns', function() {
    it('should be able to change the number of columns', function() {
      var columns = ko.observableArray([{
        text: 'fruit'
      }])

      testSetup({
        columns: columns,
        data: fruits
      })
      textNodesFor('tbody tr td').should.deep.equal(['apple', 'banana'])

      columns.push({ text: 'color' })
      textNodesFor('tbody tr td').should.deep.equal(['apple', 'red', 'banana', 'yellow'])
    })

    it('should be able to add functionality to existing columns', function() {
      var columns = ko.observableArray([{
        text: 'fruit'
      }, {
        text: 'color'
      }])

      fruits.push({
        fruit: 'strawberry',
        needsPeeling: 25,
        color: 'red'
      })

      testSetup({
        columns: columns,
        data: fruits
      })
      textNodesFor('tbody td:first-child').should.deep.equal(['apple', 'banana', 'strawberry'])

      columns([{
        text: 'fruit'
      }, {
        text: 'color',
        filterOptions: ['red', 'yellow']
      }])
      // Note: this test fails if you mutate item 1 in place and call notifySubscribers(). not sure why.
      clock.tick(10)

      testEl.querySelector('thead .frypan-filters a').should.be.ok
      filterOn(1, 1)
      textNodesFor('tbody td:first-child span').should.deep.equal(['banana'])
    })

    describe('implicit', function() {
      it('should default to creating text columns for properties on a data item as it changes', function() {
        var data = ko.observableArray()
        testSetup('data: data', {
          data: data
        })
        textNodesFor('tbody td').should.deep.equal([])

        data.push({ id: 1, fruit: 'strawberry' })
        textNodesFor('tbody td').should.deep.equal(['1', 'strawberry'])
      })

      it('should work with observables behind properties', function() {
        var viewModel = {}, data = ko.observableArray()
        Object.defineProperty(viewModel, 'data', {
          get: data,
          enumerable: true
        })
        testSetup('data: data', viewModel)
        textNodesFor('tbody td').should.deep.equal([])

        data.push({ id: 1, fruit: 'strawberry' })
        textNodesFor('tbody td').should.deep.equal(['1', 'strawberry'])
      })

      it('should calculate them for asyncrounous data sources', function() {
        var resolve, promise = new Promise(function(res) {
          resolve = res
        }),
        dataRequest = sinon.spy(function() { return promise })

        testSetup('data: data', { data: dataRequest })
        textNodesFor('tbody td').should.deep.equal([])

        resolve([{ id: 1, fruit: 'strawberry', needsPeeling: false }, { id: 2, fruit: 'pineapple' }])
        return promise.then(function() {
          textNodesFor('tbody td').should.deep.equal(['1', 'strawberry', 'false', '2', 'pineapple', ''])
        })
      })
    })
  })

  describe('virtualization', function() {
    before(function() {
      document.styleSheets[0].insertRule('frypan { display: block; width: 300px; height: 200px; overflow: auto }', 1);
    })
    beforeEach(function() {
      addFruits(100)
    })

    it('should not virtualize when the frypan element does not scroll', function() {
      document.styleSheets[0].deleteRule(1)
      testSetup('data: data', { data: fruits })
      
      getComputedStyle(testEl.querySelector('thead')).position.should.equal('static')
      testEl.querySelector('tbody:not(.frypan-top-spacer):not(.frypan-bottom-spacer)').offsetHeight.should.be.above(1000)

      document.styleSheets[0].insertRule('frypan { display: block; width: 300px; height: 200px; overflow: auto }', 1);
    })

    it('should float the header', function() {
      testSetup('data: data', { data: fruits })
      var style = getComputedStyle(testEl.querySelector('thead'))
      style.position.should.equal('absolute')
      style.left.should.equal('0px')
      style.top.should.equal('0px')
    })

    it('should have an initial offset of 0 and top and bottom spacers calculated correctly', function() {
      testSetup('data: data', { data: fruits })

      thead = testEl.querySelector('thead')
      testEl.querySelector('.frypan-top-spacer').offsetHeight.should.equal(20)
      testEl.querySelector('.frypan-bottom-spacer').offsetHeight.should.equal(1820)
    })

    it('should update the spacers and offset when the user scrolls', function(done) {
      clock.restore()
      clock = null
      testSetup('data: data', { data: fruits })

      var
        scrollArea = testEl.querySelector('.frypan-scroll-area'),
        topSpacer = testEl.querySelector('.frypan-top-spacer'),
        bottomSpacer = testEl.querySelector('.frypan-bottom-spacer')

      scrollArea.scrollTop = 171
      setTimeout(function() {
        topSpacer.offsetHeight.should.equal(180)
        bottomSpacer.offsetHeight.should.equal(1680)

        scrollArea.scrollTop = 320
        setTimeout(function() {
          topSpacer.offsetHeight.should.equal(340)
          bottomSpacer.offsetHeight.should.equal(1520)
          done()
        }, 25)
      }, 25)
    })

    it('should update the bottom spacer when new data comes in', function() {
      fruits = ko.observableArray(fruits)
      testSetup('data: data', { data: fruits })
      var bottomSpacer = testEl.querySelector('.frypan-bottom-spacer')
      bottomSpacer.offsetHeight.should.equal(1820)

      addFruits(1)
      clock.tick(100)

      bottomSpacer.offsetHeight.should.equal(1840)
    })

    function cssWidths(selector) {
      return Array.prototype.map.call(testEl.querySelectorAll(selector), function(el) {
        var width = parseInt(el.style.width)
        width.should.be.above(30)
        return width
      })
    }

    it('should update the thead and colgroup widths when dynamic columns change', function() {
      fruits = ko.observableArray(fruits)
      testSetup('data: data', { data: fruits })

      var thWidths = cssWidths('thead th')
      thWidths.length.should.equal(3)
      cssWidths('colgroup col').should.deep.equal(thWidths)

      fruits([{ moon: 'Europa', planet: 'Jupiter' }])

      var newWidths = cssWidths('thead th')
      newWidths.length.should.equal(2)
      newWidths[0].should.not.equal(thWidths[0])
      newWidths[1].should.not.equal(thWidths[1])
      cssWidths('colgroup col').should.deep.equal(newWidths)
    })
  })
})