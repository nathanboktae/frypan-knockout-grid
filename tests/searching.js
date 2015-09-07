describe('searching', function() {
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