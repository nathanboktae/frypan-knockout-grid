describe('filtering', function() {
  var setFilterTest = function(toggle) {
      testSetup({
        filterToggleComponent: toggle,
        columns: [{
          text: 'fruit'
        }, {
          text: 'needsPeeling'
        }, {
          text: 'color',
          filterOptions: ['red', 'yellow'],
          filterComponent: function(props) {
            var col = props.col
            return e('div', { className: props.className }, col.filterOptions.map(function(color) {
              return e('a', {
                href: '',
                key: color,
                'aria-selected': col.filterValue && col.filterValue.indexOf(color) >= 0,
                onClick: function(e) {
                  e.preventDefault()
                  if (!props.filterValue) {
                    col.filterValue = [color]
                  } else {
                    var idx = val.indexOf(color)
                    idx >= 0 ? val.splice(idx, 1) : val.push(color)
                    col.filterValue = val.length ? val : undefined
                  }
                }
              }, color)
            }))
          },
          filter: function(filters, item /*, idx*/ ) {
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
      color: 'yellow',
      component: function() {
        return componentBindingValue
      }
    })
  })

  it('should optionally allow a template for the filter toggle', function() {
    setFilterTest(function(props) {
      return e('span', null, props.col.text + ' is ' + (props.col.filterValue ? 'set' : 'not set'))
    })
    testEl.querySelector('a.frypan-filter-toggle span').textContent.should.equal('color is not set')
  })

  it('should only have the filtered class when there are filters', function() {
    setFilterTest()
    testEl.querySelector('th:nth-child(3)').should.not.have.class('frypan-filtered')

    filterOn(2, 1)
    testEl.querySelector('th:nth-child(3)').should.have.class('frypan-filtered')
  })

  it('should add a class when showing filter options', function() {
    setFilterTest()
    testEl.querySelector('a.frypan-filter-toggle').innerHTML.should.be.empty
    testEl.querySelector('th:nth-child(3)').should.not.have.class('frypan-filter-open')

    click('a.frypan-filter-toggle')
    testEl.querySelector('th:nth-child(3)').should.have.class('frypan-filter-open').and.class('frypan-filter-open')
  })

  xit('should close the filter when the user clicks outside the grid, with animation classes', function() {
    setFilterTest()
    click('a.frypan-filter-toggle')
    var filterToggle = testEl.querySelector('th:nth-child(3)')
    filterToggle.should.have.class('frypan-filter-open').and.class('frypan-filter-opening')

    click('frypan tr:first-child td:first-child')
    filterToggle.should.have.class('frypan-filter-open')

    click('#mocha')
    filterToggle.should.not.have.class('frypan-filter-open')
    filterToggle.should.have.class('frypan-filter-closing')
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
