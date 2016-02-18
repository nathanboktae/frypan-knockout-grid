(function(factory) {
  if (typeof define === 'function' && define.amd) {
    define(['knockout', 'knockout-css3-animation'], factory)
  } else if (typeof exports === 'object' && typeof module === 'object') {
    module.exports = factory(require('knockout'), require('knockout-css3-animation'))
  } else {
    window.Frypan = factory(ko)
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
    grid.minColWidth = grid.minColWidth || 40
    grid.offset = ko.observable(0)
    grid.visibleRowCount = ko.observable(500)
    grid.sortedItems = ko.observableArray([]) // sync data sources replaces this with a computed
    ;['loadingHtml', 'filterToggleTemplate', 'rowClick', 'rowClass', 'resizableColumns'].forEach(function(p) {
      if (p in params) grid[p] = params[p]
    })

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
        }
        template = template.replace(/\$col/g, '$component.columns()[' + idx + ']')
        col.templateNode = document.createElement('td')
        col.templateNode.innerHTML = template
        return col
      })
    })

    if (params.reorderableColumns) {
      var reordered
      grid.reorder = function(sourceIdx, targetIdx) {
        var observable = ko.isWritableObservable(params.columns) ? params.columns : grid.columns,
            items = observable(),
            removed = items.splice(sourceIdx, 1)

        items.splice(targetIdx > sourceIdx ? targetIdx - 1 : targetIdx, 0, removed[0])
        reordered = true
        observable.notifySubscribers()
      }
    }

    var stateProps = ['searchTerm', 'showFilters', 'sortColumn', 'sortAscending'],
    settingStorage = params.settingStorage

    if (typeof settingStorage === 'string') {
      settingStorage = function() {
        if (arguments.length) {
          localStorage.setItem(params.settingStorage, JSON.stringify(arguments[0]))
        } else {
          try {
            return JSON.parse(localStorage.getItem(params.settingStorage))
          } catch (e) {}
        }
      }
    }

    if (settingStorage) {
      var settings = settingStorage(), firstCall = true
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

        if (firstCall) {
          firstCall = false
          return
        }
        settingStorage(gridState)
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
        var cols = grid.columns(),
        crit = {
          searchTerm: ko.unwrap(grid.searchTerm),
          filters: cols.map(function(col) {
            return col.filterValue && col.filterValue()
          }),
          sortColumn: cols.indexOf(grid.sortColumn()) === -1 ? undefined : grid.sortColumn(),
          sortAscending: grid.sortAscending()
        }

        if (!reordered) {
          skip(0)
        }
        return crit
      }, 1) // required to avoid recursion when updating items below

      grid.outstandingRequest = ko.observable()
      computed(function () {
        var crit = criteria()
        crit.skip = skip() // always take a dependency on these

        if (reordered) {
          reordered = false
          return outstandingRequest
        }

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
        var items = ko.unwrap(params.$raw.data()),
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
          items = items.slice()
          if (grid.sortAscending()) {
            items.sort(sortCol.sort.bind(sortCol))
          } else {
            items.sort(function() {
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
      (col.filterValue && col.filterValue() ? ' frypan-filtered' : '')
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

  ko.bindingHandlers.frypanFilter = {
    init: function(element, valueAccessor, __, ___, bindingContext) {
      element.addEventListener('click', function(e) {
        e.preventDefault()
        bindingContext.$component.toggleShowFilters(bindingContext.$index)
      })
      if (bindingContext.$component.filterToggleTemplate) {
        element.innerHTML = bindingContext.$component.filterToggleTemplate
      }
    }
  }

  ko.bindingHandlers.frypanRow = {
    init: function(element, _, __, ___, bindingContext) {
      if (bindingContext.$component.rowClick) {
        element.addEventListener('click', function(e) {
          if (bindingContext.$component.rowClick(bindingContext.$data, e)) {
            e.preventDefault()
          }
        })
      }
      return { controlsDescendantBindings: true }
    },
    update: function(element, _, __, ___, bindingContext) {
      var children = Array.prototype.slice.call(element.childNodes)
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
        rowHeight,
        waitForFirstItemsSub,
        recalcOnColChange, recalcOnFirstData,
        virtualized = overflowY === 'auto' || overflowY === 'scroll'

      if (virtualized) {
        var
          topSpacer = table.querySelector('.frypan-top-spacer'),
          bottomSpacer = table.querySelector('.frypan-bottom-spacer')

        if (!td) {
          waitForFirstItemsSub = grid.sortedItems.subscribe(function() {
            td = table.querySelector('tbody td')
            if (td) {
              waitForFirstItemsSub.dispose()
              setup()
            }
          })
        } else {
          setup()
        }
      } else if (ko.unwrap(grid.resizableColumns)) {
        if (!td) {
          waitForFirstItemsSub = grid.sortedItems.subscribe(function() {
            waitForFirstItemsSub.dispose()
            pegWidths()
          })
        } else {
          pegWidths()
        }
      }

      function recalcColWidths() {
        if (virtualized) {
          // remove virtualization temporarily to include headers and columns together in width calculation
          table.style['table-layout'] = ''
          table.style['border-spacing'] = ''
          thead.style.position = ''
          frypan.classList.remove('frypan-virtualized')
          grid.columns().forEach(function(c) { c.width(null) })
        }

        var thWidths = Array.prototype.map.call(thead.querySelectorAll('th'), function(th) {
          return th.offsetWidth
        }),
        tdWidths = Array.prototype.map.call(tbody.querySelectorAll('tr:first-child td'), function(td) {
          return td.offsetWidth
        }),
        columns = grid.columns()

        for (var i = 0; i < columns.length; i++) {
          columns[i].width(Math.max(thWidths[i] || 0, tdWidths[i] || 0))
        }

        if (virtualized) {
          table.style['table-layout'] = 'fixed'
          table.style['border-spacing'] = '0'
          thead.style.position = 'absolute'
          frypan.classList.add('frypan-virtualized')
        }
      }

      function pegWidths() {
        if (!recalcOnColChange) {
          recalcOnColChange = grid.columns.subscribe(function() {
            recalcColWidths()
            if (!recalcOnFirstData) {
              recalcOnFirstData = grid.sortedItems.subscribe(function() {
                recalcOnFirstData.dispose()
                recalcOnFirstData = null
                recalcColWidths()
              })
            }
          })
        }
        recalcColWidths()

        table.style['table-layout'] = 'fixed'
        table.style['border-spacing'] = '0'
        table.style.width = '1px'
      }

      function setup() {
        rowHeight = td.offsetHeight
        if (frypanStyle.display !== 'flex') {
          scrollArea.style.height = '100%'
        }
        scrollArea.style['overflow'] = overflowY
        frypan.style['overflow'] = 'hidden'

        tbody.style.height = scrollArea.offsetHeight - thead.offsetHeight
        topSpacer.style.display = 'block'
        bottomSpacer.style.display = 'block'

        pegWidths()

        scrollArea.parentElement.style.position = 'relative'
        thead.style.top = 0
        thead.style.left = 0

        updateVisibleRowCount()
        ko.computed(updateOffset, null, { disposeWhenNodeIsRemoved: tbody })
        scrollArea.addEventListener('scroll', updateOffset)

        var pendingResize, sizeAtStart = window.innerWidth,
        resizeListener = function () {
          updateVisibleRowCount()
          if (!grid.resizableColumns) {
            recalcColWidths()
          } else {
            if (pendingResize) {
              clearTimeout(pendingResize)
            }
            pendingResize = setTimeout(function() {
              pendingResize = null
              var delta = window.innerWidth - sizeAtStart
              sizeAtStart = window.innerWidth

              for (var len = grid.columns().length, d = Math.floor(delta / len), i = 0; i < len; i++) {
                var w = grid.columns()[i].width
                w(Math.max(w() + d + (i === 0 ? delta % len : 0), ko.unwrap(grid.minColWidth)))
              }
            }, 100)
          }
        }
        window.addEventListener('resize', resizeListener)

        ko.utils.domNodeDisposal.addDisposeCallback(table, function() {
          recalcOnColChange && recalcOnColChange.dispose()
          recalcOnFirstData && recalcOnFirstData.dispose()
          window.removeEventListener('resize', resizeListener)
        })
      }

      function updateVisibleRowCount() {
        var visibleRowCount = Math.ceil((scrollArea.clientHeight - thead.offsetHeight - 1) / rowHeight) + 1
        grid.visibleRowCount(visibleRowCount)
      }

      function updateOffset() {
        var
          offset = Math.floor(Math.max(0, scrollArea.scrollTop) / rowHeight),
          topSpacerHeight = (offset * rowHeight) + thead.offsetHeight

        grid.offset(offset)
        topSpacer.style.height = topSpacerHeight + 'px'
        bottomSpacer.style.height = Math.max(0, (grid.sortedItems().length - offset - grid.visibleRowCount()) * rowHeight) + 'px'
        thead.style.left = -scrollArea.scrollLeft + 'px'
      }
    }
  }

  function onDrag(el, cb) {
    el.addEventListener('mousedown', function(downEvent) {
      var opts = cb(downEvent)

      function onMouseUp(e) {
        opts.up(e)
        document.removeEventListener('mousemove', opts.move)
        document.removeEventListener('mouseup', onMouseUp)
      }

      if (opts) {
        downEvent.preventDefault()
        document.addEventListener('mousemove', opts.move)
        document.addEventListener('mouseup', onMouseUp)
      }
    })
  }

  ko.bindingHandlers.frypanResizer = {
    init: function(element, valueAccessor, _, __, bc) {
      onDrag(element, function(downEvent) {
        element.classList.add('frypan-resizing')

        var
          width = valueAccessor(),
          intialWidth = width(),
          startMouseX = downEvent.pageX,
          targetMouseX, animationFrameRequest

        return {
          move: function(moveEvent) {
            targetMouseX = moveEvent.pageX
            if (animationFrameRequest) {
              cancelAnimationFrame(animationFrameRequest)
            }
            animationFrameRequest = requestAnimationFrame(function() {
              width(Math.max(bc.$component.minColWidth, intialWidth - startMouseX + targetMouseX))
            })
          },
          up: function() {
            if (animationFrameRequest) {
              cancelAnimationFrame(animationFrameRequest)
            }
            element.classList.remove('frypan-resizing')
          }
        }
      })
    }
  }

  ko.bindingHandlers.frypanReorder = {
    init: function(element, valueAccessor, allBindingsAccessor, _, bindingContext) {
      var reorderFunc = ko.unwrap(valueAccessor())
      if (reorderFunc) {
        onDrag(element, function(downEvent) {
          if (!downEvent.target.classList || !downEvent.target.classList.contains('frypan-sort-toggle')) {
            return
          }

          var bounds = element.getBoundingClientRect(),
              ghost = element.cloneNode(true)

          ko.cleanNode(ghost)
          ghost.style.position = 'fixed'
          ghost.style.top = (bounds.top - downEvent.offsetY) + 'px'
          ghost.style.left = (bounds.left - downEvent.offsetX) + 'px'
          ghost.style.width = bounds.width + 'px'
          ghost.style.height = bounds.height + 'px'

          element.classList.add('frypan-move-source')
          ghost.classList.add('frypan-move-ghost')

          var hoverTh
          return {
            move: function(e) {
              ghost.style.display = 'none'
              var hoverEl = document.elementFromPoint(e.pageX, e.pageY)
              if (hoverEl && hoverEl.closest) {
                var th = hoverEl.closest('th')
                if (th !== hoverTh) {
                  hoverTh && hoverTh.classList.remove('frypan-move-target')
                  th && th.classList.add('frypan-move-target')
                }
                hoverTh = th
              }

              if (!ghost.parentElement) {
                document.body.appendChild(ghost)
              }
              ghost.style.display = ''
              ghost.style.top = (e.pageY - downEvent.offsetY) + 'px'
              ghost.style.left = (e.pageX - downEvent.offsetX) + 'px'
            },
            up: function() {
              if (ghost.parentElement) {
                document.body.removeChild(ghost)
              }
              element.classList.remove('frypan-move-source')

              if (hoverTh) {
                var observable = bindingContext.$component.columns,
                    items = observable(),
                    ctx = ko.contextFor(hoverTh)

                hoverTh.classList.remove('frypan-move-target')
                if (ctx) {
                  var targetItem = ctx.$data,
                    targetIdx = items.indexOf(targetItem),
                    sourceIdx = items.indexOf(bindingContext.$data)

                  if (sourceIdx !== -1 && targetIdx !== -1) {
                    reorderFunc(sourceIdx, targetIdx)
                  }
                }
              }
            }
          }
        })
      }
    }
  }

  // the css binding is being used by `rowClass` so we use a custom simple class binding
  // well simplier if IE10 and PhantomJS supported classList fully
  ko.bindingHandlers.frypanAlt = {
    update: function(element, valueAccessor) {
      element.classList[valueAccessor() % 2 === 1 ? 'add' : 'remove']('frypan-odd')
    }
  }

  ko.components.register('frypan', {
    template: '<div class="frypan-scroll-area">\
<table>\
  <colgroup data-bind="foreach: $component.columns"><col data-bind="style: { width: $data.width() && $data.width() + \'px\' }"></col></colgroup>\
  <thead data-bind="style: { width: $component.width() + \'px\' }"><tr data-bind="foreach: $component.columns"><th data-bind="css: $component.headerClassFor($data, $index()), animation: { when: $component.showFilters() === $index(), class: \'frypan-filter-open\', enter: \'frypan-filter-opening\', exit: \'frypan-filter-closing\' }, attr: { \'aria-sort\': $component.ariaSortForCol($data) }, style: { width: $data.width() && $data.width() + \'px\' }, frypanReorder: $component.reorder">\
      <a href="" class="frypan-sort-toggle" data-bind="text: name, click: $component.toggleSort.bind($component)"></a>\
      <!-- ko if: $data.filterTemplateNodes -->\
        <a href="" class="frypan-filter-toggle" data-bind="frypanFilter:true"></a>\
        <div class="frypan-filters" data-bind="template: { nodes: $data.filterTemplateNodes }"></div>\
      <!-- /ko -->\
      <!-- ko if: $component.resizableColumns --><a class="frypan-resizer" data-bind="frypanResizer: $data.width"></a><!-- /ko -->\
    </th></tr>\
  </thead>\
  <tbody class="frypan-top-spacer" style="display: none;">\
  <tbody data-bind="foreach: items, frypanVirtualization: true"><tr data-bind="frypanRow: true, css: $component.rowClass && $component.rowClass($data, $index), frypanAlt: $component.offset() + $index()"></tr></tbody>\
  <tbody class="frypan-bottom-spacer" style="display: none;">\
</table></div>\
<div class="frypan-loader" data-bind="css: { \'frypan-loading\': outstandingRequest() }, html: $component.loadingHtml"></div>',

    viewModel: {
      createViewModel: function(params, componentInfo) {
        var loadingTemplate = componentInfo.templateNodes.filter(function(n) {
          return n.tagName === 'FRYPAN-LOADER'
        })[0]

        if (loadingTemplate) {
          params.loadingHtml = loadingTemplate.innerHTML
        }

        componentInfo.templateNodes.filter(function(n) {
          return n.tagName === 'FRYPAN-COLUMN'
        }).forEach(function(n, idx) {
          var colName = n.getAttribute('name'),
          col = colName ? (params.columns || []).filter(function(c) { return c.name === colName })[0] : params.columns[idx]
          if (col) {
            col.template = n.innerHTML
          } else {
            if (!Array.isArray(params.columns)) {
              params.columns = []
            }
            params.columns.push({ name: colName, template: n.innerHTML })
          }
        })

        var frypan = new Frypan(params),
        closeFiltersIfNeeded = function(e) {
          if (e.target && !componentInfo.element.contains(e.target)) {
            frypan.showFilters(null)
          }
        }
        document.body.addEventListener('click', closeFiltersIfNeeded)
        ko.utils.domNodeDisposal.addDisposeCallback(componentInfo.element, function() {
          document.body.removeEventListener('click', closeFiltersIfNeeded)
        })

        return frypan
      }
    },
    synchronous: true
  })

  return Frypan
})