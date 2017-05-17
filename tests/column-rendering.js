describe('column rendering', function() {
  describe('core', function() {
    it('should support computed data sources')
    it('should unmount cleanly without error')
  })

  describe('text', function() {
    it('should render the property of the row item if a string', function() {
      testSetup({
        columns: [{
          text: 'fruit'
        }],
        data: fruits
      })

      textNodesFor('tbody tr td').should.deep.equal(['apple', 'banana'])
    })

    it('should render the data if the source is an observable', function() {
      fruits = mobx.observable(fruits)
      testSetup({
        data: fruits
      })

      textNodesFor('tbody tr td').should.deep.equal(['apple', 'optional', 'red', 'banana', 'true', 'yellow'])

      fruits.push({
        fruit: 'kiwi',
        needsPeeling: true,
        color: 'green'
      })
      clock.tick(60)

      textNodesFor('tbody tr td').should.deep.equal(['apple', 'optional', 'red', 'banana', 'true', 'yellow', 'kiwi', 'true', 'green'])
    })

    it('should render the result of the function called with item and row index', function() {
      testSetup({
        columns: [{
          need: 'peeling',
          text: function(item, rowIdx, col) {
            return rowIdx + ': ' + item.fruit + (item.needsPeeling === true ? 's need ' + col.need : 's do not need ' + col.need)
          }
        }],
        data: fruits
      })

      textNodesFor('tbody tr td').should.deep.equal(['0: apples do not need peeling', '1: bananas need peeling'])
    })
  })

  describe('custom', function() {
    it('should be providable via params', function() {
      testSetup({
        columns: [{
          component: function(props) {
            return e('dl', null, [
              e('dt', { key: 'dt' }, props.item.fruit),
              e('dd', { key: 'dd' }, props.item.color)
            ])
          }
        }],
        data: fruits
      })

      textNodesFor('tbody td dt').should.deep.equal(['apple', 'banana'])
      textNodesFor('tbody td dd').should.deep.equal(['red', 'yellow'])
    })

    it('should provide column, grid, item, and index as properties', function() {
      var col = {
        component: sinon.spy(function(props) {
          return e('span', { className: 'fruit ' + props.item.color }, props.item.fruit)
        })
      }

      testSetup({
        columns: [col],
        data: fruits
      })

      col.component.should.have.been.atLeastOnce
      var props = col.component.lastCall.args[0]
      console.log(Object.keys(props.grid).join(', '))
      props.grid.should.contain.keys(['columns', 'items', 'offset', 'render'])
      props.item.should.equal(fruits[fruits.length - 1])
      props.idx.should.equal(fruits.length - 1)
      props.col.should.equal(col)

      textNodesFor('tbody td span.fruit').should.deep.equal(['apple', 'banana'])
    })
  })

  describe('class', function() {
    it('should add the class directly if a string or observable of a string', function() {
      testSetup({
        columns: [{
          className: mobx.observable('fruits')
        }],
        data: fruits
      })

      testEl.querySelector('tbody td').className.should.equal('fruits')
    })

    it('should add the class(es) for header columns, where item and rowIdx are not available', function() {
      testSetup({
        columns: [{
          className: function(item, rowIdx) {
            if (!item && rowIdx == null) {
              return 'header-class'
            }
          }
        }],
        data: fruits
      })

      attributesFor('thead th', 'class').should.deep.equal(['header-class'])
    })

    it('should add the class(es) of the result of a function called with item and row index', function() {
      testSetup({
        columns: [{
          className: function(item, rowIdx) {
            if (item) {
              return rowIdx + '-' + item.fruit + '-' + item.needsPeeling
            }
          }
        }],
        data: fruits
      })

      testEl.querySelector('tbody tr:first-child td').className.should.equal('0-apple-optional')
    })
  })

  describe('link', function() {
    it('should render an a tag wrapping the text span if provided as a string', function() {
      testSetup({
        columns: [{
          link: '/details',
          text: 'fruit'
        }],
        data: fruits
      })

      attributesFor('tbody td > a', 'href').should.deep.equal(['/details', '/details'])
      textNodesFor('tbody td > a').should.deep.equal(['apple', 'banana'])
    })

    it('should render the result of a function called with item and row index', function() {
      testSetup({
        columns: [{
          link: function(item, rowIdx) {
            return '/details/' + item.fruit + '?idx=' + rowIdx
          },
          text: 'fruit'
        }],
        data: fruits
      })

      attributesFor('tbody td > a', 'href').should.deep.equal([
        '/details/apple?idx=0',
        '/details/banana?idx=1'
      ])
    })
  })

  describe('rowClass', function() {
    it('should add a class on a row returned from the function', function() {
      testSetup({
        rowClass: function(item) {
          return 'fruit-' + item.fruit
        },
        data: fruits
      })

      attributesFor('tbody tr', 'class').should.deep.equal(['fruit-apple', 'fruit-banana frypan-odd'])
    })
  })
})
