describe('saving settings', function() {
  var storageTest = function(settings) {
    var searchTerm = ko.observable()
    testSetup('columns: columns, data: data, settingStorage: settings, searchTerm: searchTerm', {
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
      settings: settings,
      data: fruits
    })
    return searchTerm
  }

  it('should save settings in local storage if settingStorage is a string', function() {
    localStorage.setItem('fruits', 'peeeeple')
    storageTest('fruits')('ppl')
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

  it('should load settings from local storage if settingStorage is a string', function() {
    localStorage.setItem('fruits', JSON.stringify({
      sortAscending: true,
      sortColumn: 1,
      showFilters: 2,
      filters: [null, null, 'yellow'],
      searchTerm: 'nan'
    }))

    storageTest('fruits')
    clock.tick(100)

    testEl.querySelector('th:nth-child(3)').classList.contains('frypan-filtered').should.be.true
    attributesFor('thead th', 'aria-sort').should.deep.equal([undefined, 'ascending', undefined])
    textNodesFor('tbody td span em').should.deep.equal(['nan'])
  })

  it('should not load invalid settings', function() {
    localStorage.setItem('fruits', 'kablammo')
    storageTest('fruits')

    textNodesFor('tbody td:first-child span').should.deep.equal(['apple'])
  })

  it('should load settings returned from the settingStorage function', function() {
    var settings = sinon.spy(function() {
      return {
        sortAscending: true,
        sortColumn: 1,
        showFilters: 2,
        filters: [null, null, 'yellow'],
        searchTerm: 'nan'
      }
    })

    storageTest(settings)
    clock.tick(100)

    settings.should.have.been.calledOnce.and.calledWith()
    testEl.querySelector('th:nth-child(3)').classList.contains('frypan-filtered').should.be.true
    attributesFor('thead th', 'aria-sort').should.deep.equal([undefined, 'ascending', undefined])
    textNodesFor('tbody td span em').should.deep.equal(['nan'])
  })

  it('should save settings in local storage if settingStorage is a string', function() {
    var settings = sinon.spy()

    storageTest(settings)('ppl')
    click('thead th:nth-of-type(2) a')
    click('thead a.frypan-filter-toggle')

    settings.should.have.callCount(4)
    settings.lastCall.args[0].should.deep.equal({
      sortAscending: true,
      sortColumn: 1,
      showFilters: 2,
      filters: [undefined, undefined, 'red'],
      searchTerm: 'ppl'
    })
  })
})
