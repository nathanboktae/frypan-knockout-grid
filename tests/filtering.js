describe('filtering', function() {
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
