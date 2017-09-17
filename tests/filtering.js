describe('filtering', function() {
  var setFilterTest = function(toggle, comp) {
      testSetup({
        filterToggleComponent: toggle,
        columns: [{
          text: 'fruit'
        }, {
          text: 'needsPeeling'
        }, {
          text: 'color',
          filterOptions: ['red', 'yellow'],
          filterComponent: comp
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
      color: 'red',
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

  it('should use filterOptionComponent to render an option if available', function() {
    testSetup({
      columns: [{
        text: 'color',
        filterOptions: ['blue', 'green'],
        filterOptionComponent: function(props) {
          props.should.have.property('col').with.property('filterValue')
          return e('span', { key: props.option, className: 'option-comp-test' }, props.option.toUpperCase())
        }
      }],
      data: fruits
    })

    textNodesFor('thead th:first-child .frypan-filters a span.option-comp-test').should.deep.equal(['BLUE', 'GREEN'])
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
    textNodesFor('tbody td:first-child span').should.deep.equal(['banana'])
  })

  it('should add additional filters as they are clicked, and allow filter options to be removed', function() {
    setFilterTest()

    filterOn(2, 1)
    textNodesFor('.frypan-filters a[aria-selected="true"]').should.deep.equal(['yellow'])
    textNodesFor('tbody td:first-child span').should.deep.equal(['banana'])

    filterOn(2, 0)
    textNodesFor('.frypan-filters a[aria-selected="true"]').should.deep.equal(['red', 'yellow'])
    textNodesFor('tbody td:first-child span').should.deep.equal(['apple', 'banana', 'strawberry'])

    filterOn(2, 1)
    textNodesFor('.frypan-filters a[aria-selected="true"]').should.deep.equal(['red'])
    textNodesFor('tbody td:first-child span').should.deep.equal(['apple', 'strawberry'])

    filterOn(2, 0)
    textNodesFor('.frypan-filters a[aria-selected="true"]').should.be.empty.mmmkay
    textNodesFor('tbody td:first-child span').should.deep.equal(['apple', 'banana', 'strawberry'])
  })

  it('should allow a custom filter component to be provided', function() {
    setFilterTest(null, function(props) {
      return e('ul', { className: props.className }, props.col.filterOptions.map(function(option) {
        return e('li', { key: option }, option)
      }))
    })

    click('a.frypan-filter-toggle')
    textNodesFor('thead th:nth-of-type(3) ul.frypan-filters li').should.deep.equal(['red', 'yellow'])
  })

  it('should allow a custom filter function to be provided')
  it('should require a custom function when no text property is on the column')
})
