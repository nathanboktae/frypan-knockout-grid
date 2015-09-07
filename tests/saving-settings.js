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
