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
    testEl.querySelector('.frypan-top-spacer').offsetHeight.should.be.above(19).and.below(22)
    testEl.querySelector('.frypan-bottom-spacer').offsetHeight.should.be.above(1839).and.below(1842)
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
      topSpacer.offsetHeight.should.equal(randomOf(180, 181))
      bottomSpacer.offsetHeight.should.equal(randomOf(1680, 1681))
    }).then(function() {
      scrollArea.scrollTop = 320
    }).then(function() {
      return pollUntilPassing(function() {
        [320, 340, 341].some(function(x) { return topSpacer.offsetHeight == x }).should.be.true;
        [1520, 1540, 1561].some(function(x) { return bottomSpacer.offsetHeight == x }).should.be.true
      })
    })
  })

  it('should add a frypan-odd class to odd index rows', function() {
    clock.restore()
    clock = null
    testSetup('data: data', { data: fruits })

    var tbody = testEl.querySelector('tbody:not(.frypan-top-spacer):not(.frypan-bottom-spacer)')

    tbody.querySelectorAll('tr.frypan-odd').length.should.equal(5)
    tbody.querySelector('tr:first-child').should.not.have.class('frypan-odd')
    tbody.querySelector('tr:nth-child(2)').should.have.class('frypan-odd')
    // need slice(0,3) for a phantomjs bug
    textNodesFor('tr.frypan-odd:nth-child(2) td').slice(0,3).should.deep.equal(['banana', 'true', 'yellow'])

    testEl.querySelector('.frypan-scroll-area').scrollTop = 35
    return pollUntilPassing(function() {
      tbody.querySelector('tr:first-child').should.have.class('frypan-odd')
      tbody.querySelector('tr:nth-child(2)').should.not.have.class('frypan-odd')
      textNodesFor('tr.frypan-odd:first-child td').should.deep.equal(['banana', 'true', 'yellow'])
    })
  })

  it('should update the bottom spacer when new data comes in', function() {
    fruits = ko.observableArray(fruits)
    testSetup('data: data', { data: fruits })
    var bottomSpacer = testEl.querySelector('.frypan-bottom-spacer')
    bottomSpacer.offsetHeight.should.equal(1840)

    addFruits(1)
    clock.tick(100)

    bottomSpacer.offsetHeight.should.equal(1860)
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

  if (window.MutationObserver && window.MutationObserver.toString() === 'function MutationObserver() { [native code] }') {
    it('should release widths to let the grid naturally resize when not using resziable columns', function(done) {
      clock.restore()
      clock = null
      testSetup('data: data', { data: fruits })

      var widthChanges = 0, tableChanged
      observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.target.tagName === 'TH' && mutation.attributeName === 'style') widthChanges++
          if (mutation.target.tagName === 'TABLE' && /px/.test(mutation.target.style.width)) tableChanged = true
          if (tableChanged && widthChanges > 4) done()
        })
      })
      observer.observe(testEl.querySelector('thead'), {
        subtree: true,
        attributes: true,
      })
      observer.observe(testEl.querySelector('table'), { attributes: true })

      var evt = document.createEvent('Events')
      evt.initEvent('resize', true, true)
      window.dispatchEvent(evt)

      setTimeout(function() {
        observer.disconnect()
      }, 3)
    })

    it('should not resize the grid when using resziable columns', function(done) {
      clock.restore()
      clock = null
      testSetup('data: data, resizableColumns: true', { data: fruits })

      var widthChanges = 0
      observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.target.tagName === 'TH' && mutation.attributeName === 'style') {
            clearTimeout(complete)
            done(new Error('a <th> width was changed when it should not have'))
          }
        })
      })
      observer.observe(testEl.querySelector('thead'), {
        subtree: true,
        attributes: true,
      })

      var evt = document.createEvent('Events')
      evt.initEvent('resize', true, true)
      window.dispatchEvent(evt)

      setTimeout(function() {
        observer.disconnect()
      }, 3)
      var complete = setTimeout(function() {
        done()
      }, 20)
    })
  }
})
