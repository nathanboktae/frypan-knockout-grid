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
      async = typeof ko.unwrap(params.data) === 'function',
      computeds = [],
      computed = function(func, throttle) {
        var c = throttle ? ko.computed(func).extend({ throttle: throttle }) : ko.computed(func)
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
    grid.resizableColumns = params.resizableColumns
    grid.sortedItems = ko.observableArray([]) // sync data sources replaces this with a computed

    if (!Array.isArray(ko.unwrap(params.columns))) {
      var sampleItemKeys = computed(function() {
        var sampleItem = async ? grid.sortedItems()[0] : ko.unwrap(params.data)[0]
        // returning a joined string here as observables don't do deep equals
        return sampleItem ? Object.keys(sampleItem).join('🙈') : ''
      })
    }

    grid.columns = computed(function() {
      var cols = ko.unwrap(params.columns) || sampleItemKeys().split('🙈').map(function(k) { return { text: k, name: k } })
      return cols.map(function(col, idx) {
        if (col.filterTemplate) {
          if (typeof col.filter !== 'function' && !async) {
            throw new Error('A filter function is required when filtering synchronous sources')
          }
          if (!ko.isObservable(col.filterValue)) {
            col.filterValue = ko.observable()
          }
          col.filterTemplateNodes = ko.utils.parseHtmlFragment(ko.unwrap(col.filterTemplate))
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

        var template = ko.unwrap(col.template)
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
          grid[prop](prop === 'sortColumn' ? grid.columns()[settings[prop]] : settings[prop])
        })
        if (Array.isArray(settings.filters)) {
          grid.columns().forEach(function(col, colIdx) {
            col.filterValue && col.filterValue(settings.filters[colIdx])
          })
        }
      }

      computed(function() {
        var gridState = {
          filters: grid.columns().map(function(col) {
            return col.filterValue && col.filterValue()
          })
        }
        stateProps.forEach(function(prop) {
          gridState[prop] = prop === 'sortColumn' ? grid.columns().indexOf(grid[prop]()) : grid[prop]()
        })

        localStorage.setItem(storageKey, JSON.stringify(gridState))
      })
    }

    if (async) {
      var
        outstandingRequest,
        criteriaChangedDuringRequest = false,
        skip = ko.observable(0)

      // infinite scrolling
      computed(function() {
        var
          itemCount = (ko.utils.peekObservable(grid.sortedItems) || []).length,
          rowCount = grid.visibleRowCount()
        if (itemCount > rowCount && itemCount - grid.offset() < rowCount * 2) {
          skip(itemCount)
        }
      }, 5)

      var criteria = computed(function() {
        skip(0)
        return {
          searchTerm: ko.unwrap(grid.searchTerm),
          filters: grid.columns().map(function(col) {
            return col.filterValue && col.filterValue()
          }),
          sortColumn: grid.columns().indexOf(grid.sortColumn()) === -1 ? undefined : grid.sortColumn(),
          sortAscending: grid.sortAscending()
        }
      }, 1) // required to avoid recursion when updating items below

      grid.outstandingRequest = ko.observable()
      computed(function () {
        var crit = criteria()
        crit.skip = skip() // always take a dependency on these
        if (!outstandingRequest) {
          outstandingRequest = ko.unwrap(params.data).call(grid, crit)
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
            if (!Array.isArray(items)) {
              throw new Error('async request did not result in an array of items but was ' + typeof items)
            }
            if (crit.skip) {
              grid.sortedItems.splice.apply(grid.sortedItems, [crit.skip, 0].concat(items))
            } else {
              grid.sortedItems(items)
            }
            notify()
          }, notify)
        } else {
          criteriaChangedDuringRequest = true
        }
        return outstandingRequest
      }, 1)
    } else {
      var filteredItems = computed(function() {
        var items = ko.unwrap(params.data),
            columns = grid.columns(),
            searchTerm = ko.unwrap(grid.searchTerm)

        columns.forEach(function(col) {
          if (col.filterValue && col.filterValue()) {
            items = items.filter(col.filter.bind(col, col.filterValue()))
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
      }, 50)

      grid.sortedItems = computed(function() {
        var sortCol = grid.sortColumn(),
            items = filteredItems()

        if (sortCol) {
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
    var val = ko.unwrap(col && col.text)
    if (typeof val === 'string') return item && item[val]
    if (typeof val === 'function') {
      return val.call(this, item, rowIdx) || ''
    }
  }

  function getVal(prop, col, item, rowIdx) {
    var val = ko.unwrap(col && col[prop])
    if (typeof val === 'string') return val
    if (typeof val === 'function') {
      return val.call(this, item, rowIdx && rowIdx()) || ''
    }
  }
  Frypan.prototype.classFor = function(col, item, rowIdx) {
    return getVal.call(this, 'class', col, item, rowIdx)
  }
  Frypan.prototype.headerClassFor = function(col, colIdx) {
    return (getVal.call(this, 'class', col) || '') +
      (col.filterValue && col.filterValue() ? ' frypan-filtered' : '') +
      (this.showFilters() === colIdx ? ' frypan-filter-open' : '')
  }
  Frypan.prototype.linkFor = function(col, item, rowIdx) {
    return getVal.call(this, 'link', col, item, rowIdx)
  }

  Frypan.prototype.toggleSort = function(col) {
    if (col === this.sortColumn()) {
      this.sortAscending(!this.sortAscending())
    } else {
      this.sortColumn(col)
    }
  }

  Frypan.prototype.ariaSortForCol = function(col) {
    if (this.sortColumn() === col) {
      return this.sortAscending() ? 'ascending' : 'descending'
    }
  }

  Frypan.prototype.toggleShowFilters = function(idx) {
    idx = ko.unwrap(idx)
    this.showFilters(this.showFilters() === idx ? null : idx)
  }

  Frypan.prototype.width = function() {
    return this.columns().reduce(function(width, col) {
      return width + col.width()
    }, 0)
  }

  var cleanse = document.createElement('div')
  ko.bindingHandlers.frypanText = {
    update: function(element, valueAccessor, _, __, bindingContext) {
      var text = ko.unwrap(valueAccessor()),
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
        frypan = scrollArea.parentElement,
        frypanStyle = getComputedStyle(frypan),
        overflowY = frypanStyle['overflow-y'],
        grid = bindingContext.$component,
        thead = table.querySelector('thead'),
        td = table.querySelector('tbody td'),
        rowHeight, sub

      if (overflowY === 'auto' || overflowY === 'scroll') {
        var
          topSpacer = table.querySelector('.frypan-top-spacer'),
          bottomSpacer = table.querySelector('.frypan-bottom-spacer')

        if (!td) {
          sub = grid.sortedItems.subscribe(function() {
            var td = table.querySelector('tbody td')
            if (td) {
              sub.dispose()
              setup(td)
            }
          })
        } else {
          setup(td)
        }
      }
      if (!bottomSpacer && ko.unwrap(grid.resizableColumns)) {
        if (!td) {
          sub = grid.sortedItems.subscribe(function() {
            sub.dispose()
            pegWidths()
          })
        } else {
          pegWidths()
        }
      }

      function pegWidths() {
        ko.computed(function() {
          var colWidths = Array.prototype.map.call(thead.querySelectorAll('th'), function(th) {
            return th.offsetWidth
          })
          for (var i = 0; i < colWidths.length; i++) {
            grid.columns()[i].width(colWidths[i])
          }
        }, null, { disposeWhenNodeIsRemoved: table })
        table.style['table-layout'] = 'fixed'
        table.style['border-spacing'] = '0'
        table.style.width = '1px'
      }

      function setup(td) {
        rowHeight = td.offsetHeight
        if (frypanStyle.display !== 'flex') {
          scrollArea.style.height = '100%'
        }
        scrollArea.style['overflow'] = overflowY
        frypan.style['overflow'] = 'hidden'

        tbody.style.height = scrollArea.offsetHeight - thead.offsetHeight
        topSpacer.style.display = 'block'
        bottomSpacer.style.display = 'block'

        // Peg the widths of the columns before we float the table header,
        // since when we do it will change
        pegWidths()

        scrollArea.parentElement.style.position = 'relative'
        thead.style.position = 'absolute'
        thead.style.top = 0
        thead.style.left = 0

        updateVisibleRowCount()
        ko.computed(function() {
          updateOffset(grid)
        }, null, { disposeWhenNodeIsRemoved: tbody })

        scrollArea.addEventListener('scroll', updateOffset.bind(null, grid))
        window.addEventListener('resize', updateVisibleRowCount)
        ko.utils.domNodeDisposal.addDisposeCallback(table, function() {
          window.removeEventListener('resize', updateVisibleRowCount)
        })
      }

      function updateVisibleRowCount() {
        var visibleRowCount = Math.ceil((scrollArea.clientHeight - thead.offsetHeight - 1) / rowHeight) + 2
        grid.visibleRowCount(visibleRowCount)
      }

      function updateOffset(grid) {
        var
          offset = Math.floor(scrollArea.scrollTop / rowHeight),
          topSpacerHeight = (offset * rowHeight) + thead.offsetHeight

        grid.offset(offset)
        topSpacer.style.height = topSpacerHeight + 'px'
        bottomSpacer.style.height = (Math.max(0, grid.sortedItems().length - offset - grid.visibleRowCount()) * rowHeight) + 'px'
        thead.style.left = -scrollArea.scrollLeft + 'px'
      }
    }
  }

  ko.bindingHandlers.frypanResizer = {
    init: function(element, valueAccessor, __, ___, bindingContext) {
      element.addEventListener('mousedown', function(downEvent) {
        downEvent.preventDefault()
        element.classList.add('frypan-resizing')

        var
          width = valueAccessor(),
          intialWidth = width(),
          startMouseX = downEvent.pageX,
          targetMouseX, animationFrameRequest

        function onMouseMove(moveEvent) {
          targetMouseX = moveEvent.pageX
          if (animationFrameRequest) {
            cancelAnimationFrame(animationFrameRequest)
          }
          animationFrameRequest = requestAnimationFrame(function() {
            width(Math.max(15, intialWidth - startMouseX + targetMouseX))
          })
          moveEvent.preventDefault()
        }

        function onMouseUp() {
          if (animationFrameRequest) {
            cancelAnimationFrame(animationFrameRequest)
          }
          element.classList.remove('frypan-resizing')
          document.removeEventListener('mousemove', onMouseMove)
          document.removeEventListener('mouseup', onMouseUp)
        }

        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
      })
    }
  }

  return ko.components.register('frypan', {
    template: '<div class="frypan-scroll-area">\
<table>\
  <colgroup data-bind="foreach: $component.columns"><col data-bind="style: { width: $data.width() && $data.width() + \'px\' }"></col></colgroup>\
  <thead data-bind="style: { width: $component.width() + \'px\' }"><tr data-bind="foreach: $component.columns">\
    <th data-bind="css: $component.headerClassFor($data, $index()), attr: { \'aria-sort\': $component.ariaSortForCol($data) }, style: { width: $data.width() && $data.width() + \'px\' }">\
      <a href="" class="frypan-sort-toggle" data-bind="text: name, click: $component.toggleSort.bind($component)"></a>\
      <!-- ko if: $data.filterTemplateNodes -->\
        <a href="" class="frypan-filter-toggle" data-bind="click: $component.toggleShowFilters.bind($component, $index)"></a>\
        <div class="frypan-filters" data-bind="template: { nodes: $data.filterTemplateNodes }, visible: $component.showFilters() === $index()"></div>\
      <!-- /ko -->\
      <!-- ko if: $component.resizableColumns --><a class="frypan-resizer" data-bind="frypanResizer: $data.width"></a><!-- /ko -->\
    </th></tr>\
  </thead>\
  <tbody class="frypan-top-spacer" style="display: none;">\
  <tbody data-bind="foreach: items, frypanVirtualization: true"><tr data-bind="frypanRow:true, css: { \'frypan-odd\': ($component.offset() + $index()) % 2 === 1 }"></tr></tbody>\
  <tbody class="frypan-bottom-spacer" style="display: none;">\
</table></div>\
<div class="frypan-loading" data-bind="visible: outstandingRequest(), html: $component.loadingHtml"></div>',

    viewModel: {
      createViewModel: function(params, componentInfo) {
        var loadingTemplate = componentInfo.templateNodes.filter(function(n) {
          return n.tagName === 'FRYPAN-LOADING'
        })[0]

        if (loadingTemplate) {
          params.loadingHtml = loadingTemplate.innerHTML
        }

        return new Frypan(params)
      }
    },
    synchronous: true
  })
})
