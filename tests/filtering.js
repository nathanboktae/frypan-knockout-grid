describe('filtering', function() {
  var setFilterTest = function() {
    testSetup({
      columns: [{
        text: 'fruit'
      }, {
        text: 'needsPeeling'
      }, {
        text: 'color',
        filterOptions: ['red', 'yellow'],
        filterTemplate: '<div data-bind="foreach: $data.filterOptions"><a href="" data-bind="text: $data, attr: { \'aria-selected\': $parent.filterValue() && $parent.filterValue().indexOf($data) >= 0 }, click: $parent.toggleFilter.bind($parent)"></a></div>',
        toggleFilter: function(color) {
          var val = this.filterValue()
          if (!val) {
            this.filterValue([color])
          } else {
            var idx = val.indexOf(color)
            idx >= 0 ? val.splice(idx, 1) : val.push(color)
            this.filterValue(val.length && val)
          }
        },
        filter: function(filters, item/*, idx*/) {
          return filters.indexOf(item.color) >= 0
        }
      }],
      data: fruits
    })
  },
  filterOn = function(colIdx, what) {
    click('a.frypan-filter-toggle')
    click('thead th:nth-of-type(' + (colIdx + 1) + ') .frypan-filters a:nth-of-type(' + (what + 1) + ')')
    clock.tick(100)
  }

  beforeEach(function() {
    fruits.push({
      fruit: 'strawberry',
      needsPeeling: 25,
      color: 'yellow'
    })
  })

  it('should not show filter options until clicked', function() {
    setFilterTest()
    testEl.querySelector('.frypan-filters').style.display.should.equal('none')
  })

  it('should only have the filtered class when there are filters', function() {
    setFilterTest()
    testEl.querySelector('a.frypan-filter-toggle').classList.contains('frypan-filtered').should.be.false

    filterOn(2, 1)
    testEl.querySelector('a.frypan-filter-toggle').classList.contains('frypan-filtered').should.be.true
  })

  it('should not filter anything out by default', function() {
    setFilterTest()

    textNodesFor('tbody td:first-child span').should.deep.equal(['apple', 'banana', 'strawberry'])
  })

  it('should apply the filter function based on the filterValue', function() {
    setFilterTest()

    filterOn(2, 1)
    textNodesFor('tbody td:first-child span').should.deep.equal(['banana', 'strawberry'])
  })
})
