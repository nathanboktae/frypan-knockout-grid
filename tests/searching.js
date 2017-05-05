describe('searching', function() {
  var rowClick, searchTestSetup = function(searchFunc) {
    testEl = document.createElement('div')
    testEl.innerHTML = '<aside class="search"><input type="text" data-bind="value: searchTerm, valueUpdate: \'input\'"></aside><frypan params="columns: columns, data: data, searchTerm: searchTerm, rowClick: rowClick"></frypan>'
    document.body.appendChild(testEl)

    rowClick = sinon.spy(function() {
      return true
    })
    ko.applyBindings({
      searchTerm:           }
          }
mobx.observable(),
      data: fruits,
      columns: [{
        text: 'fruit',
        search: searchFunc
      }],
      rowClick: rowClick
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

  it('should provide the correct item to rowClick when a row is clicked', function() {
    searchTestSetup()
    searchFor('ban')
    click('tbody tr:first-child td')

    rowClick.should.have.been.calledOnce
    rowClick.lastCall.args[0].should.equal(fruits[1])
    rowClick.lastCall.args[1].defaultPrevented.should.equal.true
  })
})