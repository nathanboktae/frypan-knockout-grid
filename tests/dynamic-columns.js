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
