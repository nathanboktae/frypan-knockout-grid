describe('cell templates', function() {
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
      fruits = ko.observableArray(fruits)
      testSetup('data: data', {
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
          text: function(item, rowIdx) {
            return rowIdx + ': ' + item.fruit + (item.needsPeeling === true ? 's need peeling' : 's do not need peeling')
          }
        }],
        data: fruits
      })

      textNodesFor('tbody tr td').should.deep.equal(['0: apples do not need peeling', '1: bananas need peeling'])
    })

    it('should be able to provide a custom template', function() {
      testSetup({
        columns: [{
          template: '<dl><dt data-bind="text: $data.fruit"></dt><dd data-bind="text: $data.color"></dd></dl>'
        }],
        data: fruits
      })

      textNodesFor('tbody td dt').should.deep.equal(['apple', 'banana'])
      textNodesFor('tbody td dd').should.deep.equal(['red', 'yellow'])
    })
  })

  describe('class', function() {
    it('should add the class directly if a string or observable of a string', function() {
      testSetup({
        columns: [{
          class: ko.observable('fruits')
        }],
        data: fruits
      })

      testEl.querySelector('tbody td > span').className.should.equal('fruits')
    })

    it('should add the class(es) for header columns, where item and rowIdx are not available', function() {
      testSetup({
        columns: [{
          class: function(item, rowIdx) {
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
          class: function(item, rowIdx) {
            if (item) {
              return rowIdx + '-' + item.fruit + '-' + item.needsPeeling
            }
          }
        }],
        data: fruits
      })

      testEl.querySelector('tbody tr:first-child span').className.should.equal('0-apple-optional')
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
      textNodesFor('tbody td > a > span').should.deep.equal(['apple', 'banana'])
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

    it('should render class attributes on the anchor', function() {
      testSetup({
        columns: [{
          link: function(item, rowIdx) {
            return '/details/' + item.fruit + '?idx=' + rowIdx
          },
          text: 'fruit',
          class: 'fruits'
        }],
        data: fruits
      })

      attributesFor('tbody td > a', 'class').should.deep.equal(['fruits', 'fruits'])
    })
  })

  describe('rowClass', function() {
    it('should add a class on a row returned from the function', function() {
      testSetup('data: data, rowClass: rowClass', {
        rowClass: function(item) {
          return 'fruit-' + item.fruit
        },
        data: fruits
      })

      attributesFor('tbody tr', 'class').should.deep.equal(['fruit-apple', 'fruit-banana frypan-odd'])
    })
  })
})
