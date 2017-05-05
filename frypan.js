(function(factory) {
  if (typeof define === 'function' && define.amd) {
    define(['knockout', 'knockout-css3-animation'], factory)
  } else if (typeof exports === 'object' && typeof module === 'object') {
    module.exports = factory(require('knockout'), require('knockout-css3-animation'))
  } else {
    window.Frypan = factory(mobx, x => mobxReact.observer(React.createClass(x)), React.createElement)
  }
})(function(mobx, component, e) {
  function unwrap(v) {
    return mobx.isObservable(v) ? v.get() : v
  }

  function init(grid, params) {
    var async = params.data === 'function',
      computeds = [],
      computed = function(func, throttle) {
        var c = throttle ? mobx.computed(func/* TODO , ?, throttle*/) : mobx.computed(func)
        computeds.push(c)
        return c
      }

    Object.defineProperty(grid, 'computeds', {
      value: computeds
    })

    mobx.extendObservable(grid, {
      offset: 0,
      visibleRowCount: 500,
      minColWidth: params.minColWidth || 40,
    })

    grid.sortedItems = mobx.observable([]) // sync sources replace this with a computed

    // read-write required params with optionally supplied observable
    ;['sortColumn', 'sortAscending'].forEach(function(p) {
      var obv = mobx.isObservable(params[p]) ? params[p] : mobx.observable()
      Object.defineProperty(grid, p, {
        enumerable: true,
        get: function() {
          return obv.get()
        },
        set: function(v) {
         obv.set(v)
        }
      })
    })
    // read-only possibly observable optional params
    ;['searchTerm', 'rowClass'].forEach(function(p) {
      if (p in params) {
        Object.defineProperty(grid, p, {
          enumerable: true,
          get: function() {
            return unwrap(params[p])
          }
        })
      }
    })
    // optional non-observable params
    ;['loadingHtml', 'filterToggleTemplate', 'rowClick', 'resizableColumns'].forEach(function(p) {
      if (p in params) grid[p] = params[p]
    })

    if (!params.columns) {
      var sampleItemKeys = computed(function() {
        var sampleItem = async ? grid.sortedItems.get()[0] : params.data[0]
        // TODO stil true for mobx? returning a joined string here as observables don't do deep equals
        return sampleItem ? Object.keys(sampleItem).join('🙈') : ''
      })
    }

    var columns = computed(function() {
      var cols = params.columns || sampleItemKeys.get().split('🙈').map(function(k) { return { text: k, name: k } })
      return cols.map(function(col, idx) {
        if (col.filterTemplate) {
          if (typeof col.filter !== 'function' && !async) {
            throw new Error('A filter function is required when filtering synchronous sources')
          }
          if (!mobx.isObservable(col.filterValue)) {
            col.filterValue = mobx.observable()
          }
          // TODO: filterTemplate
        }
        if (typeof col.sort !== 'function') {
          col.sort = function(a, b) {
            var aText = textFor(grid, col, a),
                bText = textFor(grid, col, b)

            if (aText === bText) return 0
            return aText < bText ? -1 : 1
          }
        }

        mobx.extendObservable(col, {
          width: col.width
        })

        // TODO: template
        return col
      })
    })

    Object.defineProperty(grid, 'columns', {
      enumerable: true,
      get: function() {
        return columns.get()
      }
    })

    if (params.reorderableColumns) {
      var reordered
      grid.reorder = function(sourceIdx, targetIdx) {
        // TODO: this probably won't work when params.columns isn't an observable
        var items = mobx.isObservableArray(params.columns) ? params.columns : grid.columns
        mobx.runInAction(function() {
          var removed = items.splice(sourceIdx, 1)
          items.splice(targetIdx > sourceIdx ? targetIdx - 1 : targetIdx, 0, removed[0])
        })
        reordered = true
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
          grid[prop](prop === 'sortColumn' ? grid.columns[settings[prop]] : settings[prop])
        })
        if (Array.isArray(settings.filters)) {
          grid.columns.forEach(function(col, colIdx) {
            col.filterValue && col.filterValue(settings.filters[colIdx])
          })
        }
      }

      computed(function() {
        var gridState = {
          filters: grid.columns.map(function(col) {
            return col.filterValue && col.filterValue()
          })
        }
        stateProps.forEach(function(prop) {
          gridState[prop] = prop === 'sortColumn' ? grid.columns.indexOf(grid[prop]()) : grid[prop]()
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
        skip = mobx.observable(0)

      // infinite scrolling
      computed(function() {
        var
          itemCount = /* TODO ko.utils.peekObservable */grid.sortedItems.get().length,
          rowCount = grid.visibleRowCount
        if (itemCount > rowCount && itemCount - grid.offset < rowCount * 2) {
          skip.set(itemCount)
        }
      }, 5)

      var criteria = computed(function() {
        var cols = grid.columns,
        crit = {
          searchTerm: grid.searchTerm,
          filters: cols.map(function(col) {
            return col.filterValue && col.filterValue.get()
          }),
          sortColumn: cols.indexOf(grid.sortColumn()) === -1 ? undefined : grid.sortColumn,
          sortAscending: grid.sortAscending
        }
        if (typeof params.additionalCriteria === 'function') {
          Object.assign(crit, params.additionalCriteria(grid))
        }

        if (!reordered) {
          skip.set(0)
        }
        return crit
      })

      grid.outstandingRequest = mobx.observable()
      computed(function () {
        var crit = criteria.get()
        crit.skip = skip.get() // always take a dependency on these

        if (reordered) {
          reordered = false
          return outstandingRequest
        }

        // TODO: ko.dependencyDetection.ignore(function() {
          if (!outstandingRequest) {
            outstandingRequest = unwrap(params.data).call(grid, crit)
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
                grid.sortedItems.set(items)
              }
              notify()
            }, notify)
          } else {
            criteriaChangedDuringRequest = true
          }
        // })
        return outstandingRequest
      }, 1)
    } else {
      var filteredItems = computed(function() {
        var items = params.data,
            columns = grid.columns,
            searchTerm = grid.searchTerm

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
                var text = textFor(grid, col, item, i)
                if (typeof text === 'string' && text.toLowerCase().indexOf(lcSearchTerm) >= 0) return true
              }
            }
          })
        }
        return items
      }, 50)

      grid.sortedItems = computed(function() {
        var sortCol = grid.sortColumn,
            items = filteredItems.get()

        if (sortCol) {
          items = items.slice()
          if (grid.sortAscending) {
            items.sort(sortCol.sort.bind(sortCol))
          } else {
            items.sort(function() { return -sortCol.sort.apply(sortCol, arguments) })
          }
        }

        return items
      })

      grid.outstandingRequest = function() {}
    }

    grid.items = computed(function() {
      var items = grid.sortedItems.get()

      if (items.length >= grid.visibleRowCount) {
        items = items.slice(grid.offset, grid.offset + grid.visibleRowCount)
      }

      return items
    })
  }

  function textFor(grid, col, item, idx) {
    var val = unwrap(col && col.text)
    if (typeof val === 'function') {
      return val.call(this, item, idx) || ''
    }
    return !item || item[val] == null ? '' : String(item[val])
  }

  function getVal(prop, { grid, col, item, idx }) {
    var val = unwrap(col && col[prop])
    if (typeof val === 'function') {
      return val.call(this, item, idx) || ''
    }
    return val == null ? '' : String(val)
  }

  var key = '1',

  FrypanText = component({
    render: function() {
      // TODO: search <em> highlighting
      var text = textFor(this.props.grid, this.props.col, this.props.item, this.props.idx)

      return e('td', { className: getVal('class', this.props) },
        this.props.col.link ?
        e('span', { key }, text) :
        e('a', { href: getVal('link', this.props), key }, text)
      )
    }
  }),

  FrypanRow = component({
    render: function() {
      var { grid, item, idx } = this.props, className = ''
      if (typeof grid.rowClass === 'function') {
        className = grid.rowClass(item, idx)
      }
      if ((grid.offset + idx) % 2 === 1) {
        className += ' frypan-odd'
      }

      return e('tr', { className }, grid.columns.map(col => e(FrypanText, { grid, col, item, idx, key: 'td' + col.name })))
    }
  }),

  FrypanTbody = component({
    render: function() {
      var grid = this.props.grid
      return e('tbody', null, grid.items.get().map((item, idx) => e(FrypanRow, { grid, item, idx, key: 'tr' + idx })))
    }
  }),

  FrypanTh = component({
    render: function() {
      var { col, grid } = this.props,
      children = [
        e('a', {
          key: 'frypan-sort-toggle',
          href: '',
          className: 'frypan-sort-toggle',
          onClick: (e) => {
            e.preventDefault()
            if (col === grid.sortColumn) {
              grid.sortAscending = !grid.sortAscending
            } else {
              grid.sortColumn = col
            }
          }
        }, col.name)
      ]
      // TODO: filterTemplateNodes
      if (grid.resizableColumns) {
        // TODO: <a class="frypan-resizer" data-bind="frypanResizer: $data.width"></a>
      }

      return e('th', {
        className: (getVal.call(this, 'class', col) || '') +
      (col.filterValue && col.filterValue.get() ? ' frypan-filtered' : ''),
        'aria-sort': this.sortColumn === col && (this.sortAscending ? 'ascending' : 'descending'),
        style: {
          width: col.width && (col.width + 'px')
        }
      }, children)
    }
  }),

  Frypan = component({
    componentWillMount: function() {
      init(this, this.props)
    },

    componentWillUnmount: function() {
      this.computeds.forEach(function(c) { c.dispose() })
    },

    render: function() {
      var grid = this
      return e('div', { className: 'frypan-scroll-area', key: 'scroll-area' }, [
        e('table', { key: 'the-table', }, [
          e('colgroup', { key: 'the-colgroup' },
            grid.columns.map(function(c) {
              return e('col', { style: { width: c.width ? c.width + 'px' : undefined }, key: 'col-' + c.name })
            })
          ),
          e('thead', { width: grid.columns.reduce((w, c) => w + c.width, 0) + 'px', key: 'the-head' }, [
            e('tr', { key: 'tr' }, grid.columns.map((col, i) => e(FrypanTh, { col, grid, key: String(i) })))
          ]),
          e('tbody', { className: 'frypan-top-spacer', style: { display: 'none' }, key: 'top-spacer' }),
          e(FrypanTbody, { grid, key: 'frypan-body' }),
          e('tbody', { className: 'frypan-bottom-spacer', style: { display: 'none' }, key: 'bottom-spacer' }),
        ])
      ])
    }
  })

  return Frypan
})