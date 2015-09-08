describe('virtualization', function() {
  before(function() {
    document.styleSheets[0].insertRule('frypan { display: block; width: 300px; height: 200px; overflow: auto }', 1);
  })
  beforeEach(function() {
    addFruits(100)
  })

  it('should not virtualize when the frypan element does not scroll', function() {
    document.styleSheets[0].deleteRule(1)
    testSetup('data: data', { data: fruits })
    
    getComputedStyle(testEl.querySelector('thead')).position.should.equal('static')
    testEl.querySelector('tbody:not(.frypan-top-spacer):not(.frypan-bottom-spacer)').offsetHeight.should.be.above(1000)

    document.styleSheets[0].insertRule('frypan { display: block; width: 300px; height: 200px; overflow: auto }', 1);
  })

  it('should float the header', function() {
    testSetup('data: data', { data: fruits })
    var style = getComputedStyle(testEl.querySelector('thead'))
    style.position.should.equal('absolute')
    style.left.should.equal('0px')
    style.top.should.equal('0px')
  })

  it('should adjust the header when the user scrolls horizontally')

  it('should have an initial offset of 0 and top and bottom spacers calculated correctly', function() {
    testSetup('data: data', { data: fruits })

    thead = testEl.querySelector('thead')
    testEl.querySelector('.frypan-top-spacer').offsetHeight.should.equal(20)
    testEl.querySelector('.frypan-bottom-spacer').offsetHeight.should.equal(1820)
  })

  it('should update the spacers and offset when the user scrolls', function(done) {
    clock.restore()
    clock = null
    testSetup('data: data', { data: fruits })

    var
      scrollArea = testEl.querySelector('.frypan-scroll-area'),
      topSpacer = testEl.querySelector('.frypan-top-spacer'),
      bottomSpacer = testEl.querySelector('.frypan-bottom-spacer')

    scrollArea.scrollTop = 171
    setTimeout(function() {
      topSpacer.offsetHeight.should.equal(180)
      bottomSpacer.offsetHeight.should.equal(1660)

      scrollArea.scrollTop = 320
      setTimeout(function() {
        topSpacer.offsetHeight.should.equal(340)
        bottomSpacer.offsetHeight.should.equal(1500)
        done()
      }, 25)
    }, 25)
  })

  it('should update the bottom spacer when new data comes in', function() {
    fruits = ko.observableArray(fruits)
    testSetup('data: data', { data: fruits })
    var bottomSpacer = testEl.querySelector('.frypan-bottom-spacer')
    bottomSpacer.offsetHeight.should.equal(1820)

    addFruits(1)
    clock.tick(100)

    bottomSpacer.offsetHeight.should.equal(1840)
  })

  function cssWidths(selector) {
    return Array.prototype.map.call(testEl.querySelectorAll(selector), function(el) {
      var width = parseInt(el.style.width)
      width.should.be.above(30)
      return width
    })
  }

  it('should update the thead and colgroup widths when dynamic columns change', function() {
    fruits = ko.observableArray(fruits)
    testSetup('data: data', { data: fruits })

    var thWidths = cssWidths('thead th')
    thWidths.length.should.equal(3)
    cssWidths('colgroup col').should.deep.equal(thWidths)

    fruits([{ moon: 'Europa', planet: 'Jupiter' }])

    var newWidths = cssWidths('thead th')
    newWidths.length.should.equal(2)
    newWidths[0].should.not.equal(thWidths[0])
    newWidths[1].should.not.equal(thWidths[1])
    cssWidths('colgroup col').should.deep.equal(newWidths)
  })
})
