describe('sorting', function() {
  beforeEach(function() {
    fruits.unshift({
      fruit: 'grapefruit',
      needsPeeling: true,
      color: 'pink'
    })
  })

  it('should sort ascending by text field if no sort function is provided', function() {
    testSetup({
      columns: [{
        text: 'fruit'
      }, {
        text: 'needsPeeling'
      }],
      data: fruits
    })

    click('thead th:first-of-type a.frypan-sort-toggle')
    textNodesFor('tbody td:first-child span').should.deep.equal(['apple', 'banana', 'grapefruit'])
  })

  it('should sort via sort function is provided', function() {
    testSetup({
      columns: [{
        text: 'fruit'
      }, {
        text: 'color',
        sort: function(a, b) {
          return a.color < b.color ? 1 : -1
        }
      }],
      data: fruits
    })

    textNodesFor('tbody td:first-child span').should.deep.equal(['grapefruit', 'apple', 'banana'])
    click('thead th:nth-of-type(2) a.frypan-sort-toggle')
    textNodesFor('tbody td:first-child span').should.deep.equal(['banana', 'apple', 'grapefruit'])
  })

  it('should sort on a column marked as the default sort column', function() {
    testSetup({
      columns: [{
        text: 'fruit'
      }, {
        text: 'color',
        defaultSort: true,
        sort: function(a, b) {
          return a.color < b.color ? 1 : -1
        }
      }],
      data: fruits
    })

    textNodesFor('tbody td:first-child span').should.deep.equal(['banana', 'apple', 'grapefruit'])
  })

  it('should sort descending if the same column is clicked again', function() {
    testSetup({
      columns: [{
        text: 'fruit'
      }, {
        text: 'needsPeeling'
      }],
      data: fruits
    })

    var colFilter = testEl.querySelector('thead th:nth-of-type(1) a.frypan-sort-toggle')
    click(colFilter)
    click(colFilter)
    textNodesFor('tbody td:first-child span').should.deep.equal(['grapefruit', 'banana', 'apple'])
  })

  it('should add a class when sorted on for the direction sorted', function() {
    testSetup({
      columns: [{
        text: 'fruit'
      }, {
        text: 'needsPeeling'
      }],
      data: fruits
    })

    var ageCol = testEl.querySelector('thead th:nth-of-type(2) a.frypan-sort-toggle')
    click(ageCol)
    clock.tick(10)
    attributesFor('thead th', 'aria-sort').should.deep.equal([undefined, 'ascending'])

    click(ageCol)
    attributesFor('thead th', 'aria-sort').should.deep.equal([undefined, 'descending'])
  })

  it('should allow providing a custom row key')
})
