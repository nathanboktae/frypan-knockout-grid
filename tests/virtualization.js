describe('virtualization', function() {
  before(function() {
    document.styleSheets[0].insertRule('frypan { display: block; width: 300px; height: 200px; overflow: auto }', 1);
  })
  after(function() {
    document.styleSheets[0].deleteRule(1)
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

  it('should adjust the header when the user scrolls horizontally', function() {
    clock.restore()
    clock = null
    fruits.forEach(function(fruit) {
      fruit.blurb = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.'
    })
    document.styleSheets[0].insertRule('tbody td, thead th { white-space: nowrap; overflow: hidden; }', 3);
    testSetup('data: data', { data: fruits })

    var
      scrollArea = testEl.querySelector('.frypan-scroll-area'),
      thead = testEl.querySelector('thead')

    scrollArea.querySelector('table').offsetWidth.should.be.above(300)
    scrollArea.scrollLeft = 25
    return pollUntilPassing(function() {
      thead.offsetLeft.should.be.above(-26).and.below(-24)
    }).then(function() {
      document.styleSheets[0].deleteRule(3)
    })
  })

  it('should have an initial offset of 0 and top and bottom spacers calculated correctly', function() {
    testSetup('data: data', { data: fruits })

    thead = testEl.querySelector('thead')
    testEl.querySelector('.frypan-top-spacer').offsetHeight.should.equal(20)
    testEl.querySelector('.frypan-bottom-spacer').offsetHeight.should.equal(1820)
  })

  it('should update the spacers and offset when the user scrolls', function() {
    clock.restore()
    clock = null
    testSetup('data: data', { data: fruits })

    var
      scrollArea = testEl.querySelector('.frypan-scroll-area'),
      topSpacer = testEl.querySelector('.frypan-top-spacer'),
      bottomSpacer = testEl.querySelector('.frypan-bottom-spacer')

    scrollArea.scrollTop = 171
    return pollUntilPassing(function() {
      topSpacer.offsetHeight.should.equal(180)
      bottomSpacer.offsetHeight.should.equal(1660)
    }).then(function() {
      scrollArea.scrollTop = 320
    }).then(function() {
      return pollUntilPassing(function() {
        topSpacer.offsetHeight.should.equal(randomOf(320, 340))
        bottomSpacer.offsetHeight.should.equal(randomOf(1500, 1520))
      })
    })
  })

  it('should add a frypan-odd class to odd index rows', function() {
    clock.restore()
    clock = null
    testSetup('data: data', { data: fruits })

    var tbody = testEl.querySelector('tbody:not(.frypan-top-spacer):not(.frypan-bottom-spacer)')
   
    tbody.querySelectorAll('tr.frypan-odd').length.should.equal(5)
    tbody.querySelector('tr:first-child').classList.contains('frypan-odd').should.be.false
    tbody.querySelector('tr:nth-child(2)').classList.contains('frypan-odd').should.be.true
    // need slice(0,3) for a phantomjs bug
    textNodesFor('tr.frypan-odd:nth-child(2) td').slice(0,3).should.deep.equal(['banana', 'true', 'yellow'])

    testEl.querySelector('.frypan-scroll-area').scrollTop = 35
    return pollUntilPassing(function() {
      tbody.querySelector('tr:first-child').classList.contains('frypan-odd').should.be.true
      tbody.querySelector('tr:nth-child(2)').classList.contains('frypan-odd').should.be.false
      textNodesFor('tr.frypan-odd:first-child td').should.deep.equal(['banana', 'true', 'yellow'])
    })
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
