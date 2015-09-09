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
        filterValue: ko.observable('red'),
        filterTemplate: '<div class="teh-filter" data-bind="text: $data.filterValue"></div>',
        filter: function(color, item) { return item.color == color }
      }],
      searchTerm: searchTerm,
      data: fruits
    })
    return searchTerm
  }

  it('should save settings in local storage if requested', function() {
    localStorage.setItem('fruits', 'peeeeple')
    storageTest()('ppl')
    click('thead th:nth-of-type(2) a')
    click('thead a.frypan-filter-toggle')

    JSON.parse(localStorage.getItem('fruits')).should.deep.equal({
      sortAscending: true,
      sortColumn: 1,
      showFilters: 2,
      filters: [null, null, 'red'],
      searchTerm: 'ppl'
    })
  })

  it('should load settings from local storage if requested', function() {
    localStorage.setItem('fruits', JSON.stringify({
      sortAscending: true,
      sortColumn: 1,
      showFilters: 2,
      filters: [null, null, 'yellow'],
      searchTerm: 'nan'
    }))

    storageTest()
    clock.tick(100)

    testEl.querySelector('a.frypan-filter-toggle').classList.contains('frypan-filtered').should.be.true
    attributesFor('thead th', 'aria-sort').should.deep.equal([undefined, 'ascending', undefined])
    textNodesFor('tbody td span em').should.deep.equal(['nan'])
  })

  it('should not load invalid settings', function() {
    localStorage.setItem('fruits', 'kablammo')
    storageTest()

    textNodesFor('tbody td:first-child span').should.deep.equal(['apple'])
  })
})
