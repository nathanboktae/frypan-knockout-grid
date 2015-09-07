var testEl, fruits, clock,
testSetup = function(bindingString, viewModel) {
  if (!viewModel) {
    viewModel = bindingString
    bindingString = null
  }

  testEl = document.createElement('frypan')
  testEl.setAttribute('params', bindingString || 'columns: columns, data: data')
  document.body.appendChild(testEl)
  ko.applyBindings(viewModel, testEl)
},
textNodesFor = function(selector) {
  return Array.prototype.map.call(testEl.querySelectorAll(selector), function(el) {
    return el.textContent.trim()
  })
},
attributesFor = function(selector, attr) {
  return Array.prototype.map.call(testEl.querySelectorAll(selector), function(el) {
    return el.attributes[attr] && el.attributes[attr].value
  })
},
click = function(el) {
  var evt = document.createEvent('MouseEvents')
  evt.initEvent('click', true, true)
  if (typeof el === 'string') {
    el = document.querySelector(el)
  }
  el.dispatchEvent(evt)
},
searchFor = function(term) {
  var input = document.querySelector('.search input')
  input.value = term
  var evt = document.createEvent('Events')
  evt.initEvent('input', true, true)
  input.dispatchEvent(evt)
  clock && clock.tick(100)
},
filterOn = function(colIdx, what) {
  click('a.frypan-filter-toggle')
  click('thead th:nth-of-type(' + (colIdx + 1) + ') .frypan-filters a:nth-of-type(' + (what + 1) + ')')
  clock.tick(100)
},
addFruits = function(n) {
  for (var i = 0; i < n; i++) {
    fruits.push({
      fruit: ['apple', 'pear', 'banana', 'kiwi', 'strawberry', 'watermelon', 'peach', 'pineapple'][(Math.random() * 8) >> 0],
      color: ['red', 'orange', 'yellow', 'green', 'pink'][(Math.random() * 5) >> 0],
      needsPeeling: [true, false, 'maybe'][(Math.random() * 3) >> 0]
    })
  }
}

beforeEach(function() {
  fruits = [{
    fruit: 'apple',
    needsPeeling: 'optional',
    color: 'red'
  }, {
    fruit: 'banana',
    needsPeeling: true,
    color: 'yellow'
  }]
  clock = sinon.useFakeTimers()
  localStorage.removeItem('fruits')
})
afterEach(function() {
  testEl && document.body.removeChild(testEl)
  testEl = null
  clock && clock.restore()
})
