xdescribe('column resizing', function() {
  [false, true].forEach(function(virtualize) {
    describe(virtualize ? 'with virtualization' : 'without virtualization', function() {
      if (virtualize) {
        before(function() {
          document.styleSheets[0].insertRule('frypan { display: block; width: 300px; height: 200px; overflow: auto }', 1);
        })
        after(function() {
          document.styleSheets[0].deleteRule(1)
        })
      }
      it('should not render resizers if resizableColumns is false (default)', function() {
        testSetup({
          data: fruits,
          columns: [{
            text: 'fruit'
          }]
        })

        testEl.querySelectorAll('a.frypan-resizer').length.should.equal(0)
      })

      it('should not render resizers if resizableColumns is true and fix widths', function() {
        testSetup({
          data: fruits,
          resizableColumns: true
        })

        testEl.querySelectorAll('a.frypan-resizer').length.should.equal(3)
        testEl.querySelector('thead').style.width.should.be.ok
      })

      it('should be able to click and drag to resize a column')
      it('should not be able to resize below a minimum width')
    })
  })
})