(function() {
  var data = ko.observableArray([{ name: 'First row', age: 0, car: 'alpha' }])

  function addItems() {
    for (var i = 0; i < 20; i++) {
      data.push({
        name: ['Bob', 'John', 'Jane', 'Anne', 'Frank', 'Lisa', 'Julie'][(Math.random() * 8) >> 0],
        age: ((Math.random() * 20) >> 0) + 20,
        car: ['Ford', 'Toyota', 'Chevy', 'BMW', 'Tesla', 'Hyundai', 'Rocketship'][(Math.random() * 8) >> 0],
        color: ['red', 'orange', 'yellow', 'gray', 'blue', 'purple', 'black', 'white'][(Math.random() * 9) >> 0],
        blurb: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.'
      })
    }
    if (data().length < 200) {
      setTimeout(addItems, 1000)
    } else {
      data.push({ name: 'last row', age: 50, car: 'Omega', color: 'purple' })
    }
  }

  addItems()

  ko.applyBindings({ data: data })
})()