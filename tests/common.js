var testEl, fruits, clock,
testSetup = function(params, viewModel) {
  if (!viewModel) {
    viewModel = params
    params = null
  }

  testEl = document.createElement('frypan')
  testEl.setAttribute('params', params || 'columns: columns, data: data')
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
searchFor = function(term) {
  var input = document.querySelector('.search input')
  input.value = term
  var evt = document.createEvent('Events')
  evt.initEvent('input', true, true)
  input.dispatchEvent(evt)
  clock && clock.tick(100)
},
addFruits = function(n) {
  for (var i = 0; i < n; i++) {
    fruits.push({
      fruit: ['apple', 'pear', 'banana', 'kiwi', 'strawberry', 'watermelon', 'peach', 'pineapple'][(Math.random() * 8) >> 0],
      color: ['red', 'orange', 'yellow', 'green', 'pink'][(Math.random() * 5) >> 0],
      needsPeeling: [true, false, 'maybe'][(Math.random() * 3) >> 0]
    })
  }
},

click = function(el) {
  var evt = document.createEvent('MouseEvents')
  evt.initEvent('click', true, true)
  if (typeof el === 'string') {
    el = document.querySelector(el)
  }
  el.dispatchEvent(evt)
},
pollUntilPassing = function(fn) {
  var resolve, tries = 0

  var attempt = function() {
    tries++
    try {
      fn()
      resolve()
    } catch(e) {
      if (tries == 60) {
        console.error(e)
      }
      if (tries < 150) {
        setTimeout(attempt, 10)
      }
    }
  } 
  setTimeout(attempt, 10)

  return new Promise(function(r) {
    resolve = r
  })
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
