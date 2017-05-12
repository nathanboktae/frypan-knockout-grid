describe('dynamic columns', function() {
  it('should be able to change the number of columns', function() {
    var columns = mobx.observable([{
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
    var columns = mobx.observable([{
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
      filterTemplate: '<a class="click-me" data-bind="click: toggle"></div>',
      toggle: function(col) {
        col.filterValue('yellow')
      },
      filter: function(val, item) {
        return item.color === val
      }
    }])
    // Note: this test fails if you mutate item 1 in place and call notifySubscribers(). not sure why.
    clock.tick(10)

    testEl.querySelector('thead .frypan-filters a').should.be.ok
    click('a.frypan-filter-toggle')
    click('a.click-me')
    clock.tick(50)
    textNodesFor('tbody td:first-child span').should.deep.equal(['banana'])
  })

  describe('implicit', function() {
    it('should default to creating text columns for properties on a data item as it changes', function() {
      var data = mobx.observable([])
      testSetup({
        data: data
      })
      textNodesFor('tbody td').should.deep.equal([])

      data.push({ id: 1, fruit: 'strawberry' })
      clock.tick(100)
      textNodesFor('tbody td').should.deep.equal(['1', 'strawberry'])
    })

    it('should work with observables behind properties', function() {
      var viewModel = {}, data = mobx.observable([])
      Object.defineProperty(viewModel, 'data', {
        get: data,
        enumerable: true
      })
      testSetup(viewModel)
      textNodesFor('tbody td').should.deep.equal([])

      data.push({ id: 1, fruit: 'strawberry' })
      clock.tick(100)
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
