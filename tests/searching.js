describe('searching', function() {
  var searchTestSetup = function(searchFunc, rowClick) {
    var searchTerm = mobx.observable()
    testEl = document.createElement('div')
    document.body.appendChild(testEl)

    render(
      e('div', null,
        e('aside', { className: 'search', key: 'searchaside' },
          e('input', {
            type: 'text',
            onInput: function(e) {
              searchTerm.set(e.target.value)
            }
          })
        ),
        e(Frypan, {
          key: 'frypan',
          searchTerm: searchTerm,
          data: fruits,
          columns: [{
            text: 'fruit',
            search: searchFunc
          }],
          rowClick: rowClick
        })
      )
    , testEl)
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
    var rowClick = sinon.spy(function(item, e) {
      item.should.equal(fruits[1])
      e.defaultPrevented.should.be.true
    })
    searchTestSetup(null, rowClick)
    searchFor('ban')
    click('tbody tr:first-child td')

    rowClick.should.have.been.calledOnce
  })
})