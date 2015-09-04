(function(factory) {
  if (typeof define === 'function' && define.amd) {
    define(['knockout'], factory)
  } else if (typeof exports === 'object' && typeof module === 'object') {
    module.exports = factory
  } else {
    factory(ko)
  }
})(function(ko) {

  function Frypan(params) {
    var
      async = typeof ko.utils.unwrapObservable(params.data) === 'function',
      computeds = [],
      computed = function() {
        var c = ko.computed.apply(ko, arguments)
        computeds.push(c)
        return c
      }

    this.dispose = function() {
      computeds.forEach(function(c) { c.dispose() })
    }

    var grid = this
    grid.searchTerm = params.searchTerm || ko.observable()
    grid.showFilters = params.showFilters || ko.observable()
    grid.sortColumn = params.sortColumn || ko.observable()
    grid.sortAscending = params.sortAscending || ko.observable(true)
    grid.offset = ko.observable(0)
    grid.visibleRowCount = ko.observable(500)
    grid.loadingHtml = params.loadingHtml
    grid.sortedItems = ko.observableArray([]) // sync data sources replaces this with a computed

    if (!Array.isArray(ko.utils.unwrapObservable(params.columns))) {
      var sampleItemKeys = computed(function() {
        var sampleItem = async ? grid.sortedItems()[0] : ko.utils.unwrapObservable(params.data)[0]
        // returning a joined string here as observables don't do deep equals
        return sampleItem ? Object.keys(sampleItem).join('🙈') : ''
      })
    }

    grid.columns = computed(function() {
      var cols = ko.utils.unwrapObservable(params.columns) || sampleItemKeys().split('🙈').map(function(k) { return { text: k, name: k } })
      return cols.map(function(col, idx) {
        if (col.filterOptions) {
          if (typeof col.filter !== 'function' && !async) {
            col.filter = function(filters, item, idx) {
              return filters.indexOf(grid.textFor(col, item, idx)) >= 0
            }
          }
          if (!ko.isObservable(col.filters)) {
            col.filters = ko.observableArray()
          }
          if (!col.filterText) {
            col.filterText = {}
          }
        }
        if (typeof col.sort !== 'function') {
          col.sort = function(a, b) {
            var aText = grid.textFor(col, a),
                bText = grid.textFor(col, b)

            if (aText === bText) return 0
            return aText < bText ? -1 : 1
          }
        }
        if (!col.width) {
          col.width = ko.observable()
        }

        var template = ko.utils.unwrapObservable(col.template)
        if (!template) {
          template = col.link ? '<a data-bind="attr: { href: $component.linkFor($col, $data, $index) }, css: $component.classFor($col, $data, $index)"><span data-bind="frypanText: $component.textFor($col, $data, $index())"></span></a>' :
            '<span data-bind="frypanText: $component.textFor($col, $data, $index()), css: $component.classFor($col, $data, $index)"></span>'
          template = template.replace(/\$col/g, '$component.columns()[' + idx + ']')
        }
        col.templateNode = document.createElement('td')
        col.templateNode.innerHTML = template
        return col
      })
    })

    var stateProps = ['searchTerm', 'showFilters', 'sortColumn', 'sortAscending'],
    storageKey = params.storageKey

    if (typeof storageKey === 'string') {
      var settings 
      try {
        settings = JSON.parse(localStorage.getItem(storageKey) || '')
      } catch (e) {}

      if (settings && typeof settings === 'object') {
        stateProps.forEach(function(prop) {
          grid[prop](settings[prop])
        })
        if (Array.isArray(settings.filters)) {
          grid.columns().forEach(function(col, colIdx) {
            if (col.filters && Array.isArray(settings.filters[colIdx]) && settings.filters[colIdx].length) {
              col.filters(settings.filters[colIdx].filter(function(f) {
                return col.filterOptions.indexOf(f) >= 0
              }))
            }
          })
        }
      }

      computed(function() {
        var gridState = {
          filters: grid.columns().map(function(col) {
            return col.filters && col.filters()
          })
        }
        stateProps.forEach(function(prop) {
          gridState[prop] = grid[prop]()
        })

        localStorage.setItem(storageKey, JSON.stringify(gridState))
      })
    }

    if (async) {
      // Asyncrounous, likely remote data
      var outstandingRequest, criteriaChangedDuringRequest = false,

      criteria = computed(function() {
        return {
          searchTerm: ko.utils.unwrapObservable(grid.searchTerm),
          filters: grid.columns().map(function(col) {
            return col.filters && col.filters().length ? col.filters() : null
          }),
          sortColumn: grid.sortColumn(),
          sortAscending: grid.sortAscending()
        }
      })

      grid.outstandingRequest = ko.observable()
      computed(function () {
        var crit = criteria() // always take a dependency on this
        if (!outstandingRequest) {
          outstandingRequest = ko.utils.unwrapObservable(params.data).call(grid, crit)
          if (!outstandingRequest || typeof outstandingRequest.then !== 'function') {
            throw new Error('A promise was not returned from the data function')
          }

          grid.outstandingRequest(outstandingRequest)
          function notify() {
            outstandingRequest = null
            grid.outstandingRequest(null)
            if (criteriaChangedDuringRequest) {
              criteriaChangedDuringRequest = false
              criteria.notifySubscribers()
            }
          }
          outstandingRequest.then(function(items) {
            grid.sortedItems(items)
            notify()
          }, notify)
        } else {
          criteriaChangedDuringRequest = true
        }
        return outstandingRequest
      })
    } else {
      // Syncrounous in memory data
      var filteredItems = computed(function() {
        var items = ko.utils.unwrapObservable(params.data),
            columns = grid.columns(),
            searchTerm = ko.utils.unwrapObservable(grid.searchTerm)

        columns.forEach(function(col) {
          if (col.filters && col.filters().length) {
            items = items.filter(col.filter.bind(col, col.filters()))
          }
        })

        if (searchTerm) {
          var lcSearchTerm = searchTerm.toLowerCase()
          items = items.filter(function(item) {
            for (var i = 0; i < columns.length; i++) {
              var col = columns[i]
              if (typeof col.search === 'function') {
                if (col.search(item, searchTerm)) return true
              } else {
                var text = grid.textFor(col, item, i)
                if (typeof text === 'string' && text.toLowerCase().indexOf(lcSearchTerm) >= 0) return true
              }
            }
          })
        }
        return items
      }).extend({ throttle: 50 })

      grid.sortedItems = computed(function() {
        var columns = grid.columns(),
            items = filteredItems()

        if (grid.sortColumn() != null) {
          var sortCol = columns[grid.sortColumn()]
          if (grid.sortAscending()) {
            items = items.sort(sortCol.sort.bind(sortCol))
          } else {
            items = items.sort(function() {
              return -sortCol.sort.apply(sortCol, arguments)
            })
          }
        }

        return items
      })

      grid.outstandingRequest = function() {}
    }

    grid.items = computed(function() {
      var items = grid.sortedItems()

      if (items.length >= grid.visibleRowCount()) {
        items = items.slice(grid.offset(), grid.offset() + grid.visibleRowCount())
      }

      return items
    })
  }

  Frypan.prototype.textFor = function(col, item, rowIdx) {
    var val = ko.utils.unwrapObservable(col.text)
    if (typeof val === 'string') return item && item[val]
    if (typeof val === 'function') {
      return val.call(this, item, rowIdx) || ''
    }
  }

  function getVal(prop, col, item, rowIdx) {
    var val = ko.utils.unwrapObservable(col[prop])
    if (typeof val === 'string') return val
    if (typeof val === 'function') {
      return val.call(this, item, rowIdx && rowIdx()) || ''
    }
  }
  Frypan.prototype.classFor = function(col, item, rowIdx) {
    return getVal.call(this, 'class', col, item, rowIdx)
  }
  Frypan.prototype.linkFor = function(col, item, rowIdx) {
    return getVal.call(this, 'link', col, item, rowIdx)
  }

  Frypan.prototype.toggleFilter = function(col, filter) {
    var idx = col.filters().indexOf(filter)
    idx >= 0 ? col.filters.splice(idx, 1) : col.filters.push(filter)
  }

  Frypan.prototype.toggleSort = function(col) {
    var colIdx = this.columns().indexOf(col)
    if (colIdx === this.sortColumn()) {
      this.sortAscending(!this.sortAscending())
    } else {
      this.sortColumn(colIdx)
    }
  }

  Frypan.prototype.ariaSortForIndex = function(idx) {
    if (this.sortColumn() === idx()) {
      return this.sortAscending() ? 'ascending' : 'descending'
    }
  }

  Frypan.prototype.toggleShowFilters = function(idx) {
    idx = ko.utils.unwrapObservable(idx)
    this.showFilters(this.showFilters() === idx ? null : idx)
  }

  var cleanse = document.createElement('div')
  ko.bindingHandlers.frypanText = {
    update: function(element, valueAccessor, _, __, bindingContext) {
      var text = ko.utils.unwrapObservable(valueAccessor()),
          term = bindingContext.$component.searchTerm()
      if (term && typeof text === 'string' && text.indexOf(term) >= 0) {
        cleanse.textContent = text
        element.innerHTML = cleanse.innerHTML.replace(term, '<em>' + term + '</em>')
      } else {
        element.textContent = text != null ? text : ''
      }
    }
  }

  ko.bindingHandlers.frypanRow = {
    init: function() {
      return { controlsDescendantBindings: true }
    },
    update: function(element, _, __, ___, bindingContext) {
      var children = Array.prototype.slice.call(element.children)
      children.forEach(function(node) {
        ko.cleanNode(element)
        element.removeChild(node)
      })
      bindingContext.$component.columns().forEach(function(col) {
        var td = col.templateNode.cloneNode(true)
        ko.cleanNode(td)
        element.appendChild(td)
      })
      ko.applyBindingsToDescendants(bindingContext, element)
    }
  }

  // dynamically figure the size of the table by letting the thead size naturally from CSS or however
  // the user chooses to do that, and then fix the column widths from that, and width and height from the `frypan` container
  ko.bindingHandlers.frypanVirtualization = {
    init: function(tbody, valueAccessor, allBindingsAccessor, rootViewModel, bindingContext) {
      var
        table = tbody.parentElement,
        scrollArea = table.parentElement,
        frypan = scrollArea.parentElement

      if (frypan.offsetWidth && frypan.offsetHeight) {
        var overflowY = getComputedStyle(frypan)['overflow-y']
        if (overflowY === 'auto' || overflowY === 'scroll') {
          var
            thead = table.querySelector('thead'),
            topSpacer = table.querySelector('.frypan-top-spacer'),
            bottomSpacer = table.querySelector('.frypan-bottom-spacer'),
            rowHeight = table.querySelector('tbody td').offsetHeight

          scrollArea.style.height = '100%'
          scrollArea.style['overflow-y'] = overflowY
          frypan.style['overflow-y'] = 'hidden'

          tbody.style.width = thead.offsetWidth
          tbody.style.height = scrollArea.offsetHeight - thead.offsetHeight
          topSpacer.style.display = 'block'
          bottomSpacer.style.display = 'block'

          // Peg the widths of the columns before we float the table header,
          // since when we do it will change
          ko.computed(function() {
            var colWidths = Array.prototype.map.call(thead.querySelectorAll('th'), function(th) {
              return th.offsetWidth
            })
            for (var i = 0; i < colWidths.length; i++) {
              bindingContext.$component.columns()[i].width(colWidths[i])
            }
          }, null, { disposeWhenNodeIsRemoved: table })

          scrollArea.parentElement.style.position = 'relative'
          thead.style.position = 'absolute'
          thead.style.top = 0
          thead.style.left = 0

          updateVisibleRowCount()
          ko.computed(function() {
            updateOffset(bindingContext.$component)
          }, null, { disposeWhenNodeIsRemoved: tbody })

          scrollArea.addEventListener('scroll', updateOffset.bind(null, bindingContext.$component))
          window.addEventListener('resize', updateVisibleRowCount)
          ko.utils.domNodeDisposal.addDisposeCallback(table, function() {
            window.removeEventListener('resize', updateVisibleRowCount)
          })
        }
      }

      function updateVisibleRowCount() {
          var visibleRowCount = Math.ceil((scrollArea.clientHeight - thead.offsetHeight - 1) / rowHeight) + 2
          bindingContext.$component.visibleRowCount(visibleRowCount)
      }

      function updateOffset(grid) {
          var
            scrollTop = scrollArea.scrollTop + thead.offsetHeight,
            topSpacerHeight = scrollTop - scrollTop % rowHeight,
            offset = (topSpacerHeight - thead.offsetHeight) / rowHeight >> 0

          grid.offset(offset)
          topSpacer.style.height = topSpacerHeight + 'px'
          bottomSpacer.style.height = (Math.max(0, grid.sortedItems().length - offset - grid.visibleRowCount()) * rowHeight) + 'px'
      }
    }
  }

  return ko.components.register('frypan', {
    template: '<div class="frypan-scroll-area">\
<table>\
  <colgroup data-bind="foreach: $component.columns"><col data-bind="style: { width: $data.width() && $data.width() + \'px\' }"></col></colgroup>\
  <thead><tr data-bind="foreach: $component.columns">\
    <th data-bind="css: $component.classFor($data), attr: { \'aria-sort\': $component.ariaSortForIndex($index) }, style: { width: $data.width() && $data.width() + \'px\' }">\
      <a href="" class="frypan-sort-toggle" data-bind="text: name, click: $component.toggleSort.bind($component)"></a>\
      <!-- ko if: $data.filterOptions -->\
        <a href="" class="frypan-filter-toggle" data-bind="click: $component.toggleShowFilters.bind($component, $index), css: { filtered: !!filters().length }"></a>\
        <div class="frypan-filters" data-bind="foreach: typeof filterOptions === \'function\' ? filterOptions() : filterOptions, visible: $component.showFilters() === $index()"><a href="" data-bind="text: $parent.filterText[$data] || $data, attr: { \'aria-selected\': $parent.filters().indexOf($data) >= 0 }, click: $component.toggleFilter.bind($component, $parent)"></a></div>\
      <!-- /ko -->\
    </th></tr>\
  </thead>\
  <tbody class="frypan-top-spacer" style="display: none;">\
  <tbody data-bind="foreach: items, frypanVirtualization: true"><tr data-bind="frypanRow:true"></tr></tbody>\
  <tbody class="frypan-bottom-spacer" style="display: none;">\
</table></div>\
<div class="frypan-loading" data-bind="visible: outstandingRequest(), html: $component.loadingHtml"></div>',

    viewModel: Frypan,
    synchronous: true
  })
})
