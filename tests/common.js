var testEl, fruits, clock,
render = ReactDOM.render.bind(ReactDOM),
e = React.createElement.bind(React),
testSetup = function(params) {
  testEl = document.createElement('div')
  document.body.appendChild(testEl)
  render(e(Frypan, params), testEl)
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
  var resolve, reject, tries = 0

  var attempt = function() {
    tries++
    try {
      fn()
      resolve()
    } catch(e) {
      if (tries < 40) {
        setTimeout(attempt, 5)
      } else {
        reject(e)
      }
    }
  }
  setTimeout(attempt, 10)

  return new Promise(function(r, rj) {
    resolve = r, reject = rj
  })
},
randomOf = function() {
  return arguments[Math.round(Math.random() * arguments.length)]
}

document.styleSheets[0].insertRule('td, th { height: 20px; margin: 0; border: 0; padding: 0 }', 10);

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
