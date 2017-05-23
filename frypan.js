(function(factory) {
  if (typeof define === 'function' && define.amd) {
    define(['mobx', 'mobx-react', 'react'], function(mobx, mobxReact, React) {
      return factory(mobx, x => mobxReact.observer(React.createClass(x)), React.createElement)
    })
  } else if (typeof exports === 'object' && typeof module === 'object') {
    var cjsReact = require('react'),
        cjsMobxReact = require('mobx-react')
    module.exports = factory(require('mobx'), x => cjsMobxReact.observer(cjsReact.createClass(x)), cjsReact.createElement)
  } else {
    window.Frypan = factory(mobx, x => mobxReact.observer(React.createClass(x)), React.createElement)
  }
})(function(mobx, component, e) {
  function unwrap(v) {
    return mobx.isObservable(v) && !mobx.isObservableArray(v) ? v.get() : v
  }

  function observableProperty(obj, p, obv) {
    Object.defineProperty(obj, p, {
      enumerable: true,
      get: function() {
        return obv.get()
      },
      set: function(v) {
       obv.set(v)
      }
    })
  }

  function init(grid, params) {
    var asyncronous = typeof params.data === 'function',
      disposables = [],
      computed = function(func, throttle) {
        if (!throttle) return mobx.computed(func)
        var d = typeof throttle === 'number' ? mobx.autorunAsync(func, throttle) : mobx.autorun(func)
        disposables.push(d)
        return d
      },
      sortedItems

    Object.defineProperty(grid, 'disposables', {
      value: disposables
    })

    mobx.extendObservable(grid, {
      offset: 0,
      visibleRowCount: 500,
      minColWidth: params.minColWidth || 40,
      outstandingRequest: mobx.observable.ref()
    })

    // read-write required params with optionally supplied *shallow box* observable
    ;['searchTerm', 'sortColumn', 'sortAscending', 'showFilters'].forEach(function(p) {
      var obv = mobx.isBoxedObservable(params[p]) ? params[p] : mobx.observable.shallowBox(params[p])
      observableProperty(grid, p, obv)
    })
    // optional non-observable params
    ;['loadingComponent', 'filterToggleComponent', 'rowClick', 'rowClass', 'resizableColumns'].forEach(function(p) {
      if (p in params) grid[p] = params[p]
    })

    if (asyncronous) {
      grid.sortedItems = sortedItems = mobx.observable([])
    }
    if (grid.sortAscending == null) {
      grid.sortAscending = true
    }

    if (!params.columns) {
      var sampleItemKeys = computed(function() {
        var sampleItem = asyncronous ? sortedItems.length && sortedItems[0] : unwrap(params.data).length && unwrap(params.data)[0]
        // TODO stil true for mobx? returning a joined string here as observables don't do deep equals
        return sampleItem ? Object.keys(sampleItem).join('🙈') : ''
      })
    }

    var columns = computed(function() {
      var cols = params.columns || sampleItemKeys.get().split('🙈').map(k => ({ text: k, name: k }))
      return cols.map(function(col, idx) {
        if (col.filterComponent) {
          if (typeof col.filter !== 'function' && !asyncronous) {
            throw new Error('A filter function is required when filtering synchronous sources')
          }
          var pd = Object.getOwnPropertyDescriptor(col, 'filterValue')
          if (!pd || typeof pd.get !== 'function') {
            observableProperty(col, 'filterValue', mobx.observable.shallowBox(col.filterValue))
          }
        }

        if (typeof col.sort !== 'function') {
          col.sort = function(a, b) {
            var aText = textFor(grid, col, a),
                bText = textFor(grid, col, b)

            if (aText === bText) return 0
            return aText < bText ? -1 : 1
          }
        }

        if (!col.name) {
          col.name = 'anoncol' + idx
        }

        if (!('width' in col)) {
          mobx.extendObservable(col, {
            width: col.width
          })
        }

        return col
      })
    })

    Object.defineProperty(grid, 'columns', {
      enumerable: true,
      get: function() {
        return columns.get()
      }
    })

    grid.sortColumn = columns.get().find(c => c.defaultSort)

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
    settingStorage = params.settingStorage || params.settingsStorage

    if (typeof settingStorage === 'string') {
      var lsKey = settingStorage
      settingStorage = function() {
        if (arguments.length) {
          localStorage.setItem(lsKey, JSON.stringify(arguments[0]))
        } else {
          try {
            return JSON.parse(localStorage.getItem(lsKey))
          } catch (e) {}
        }
      }
    }

    if (typeof settingStorage === 'function') {
      var settings = settingStorage(), firstCall = true
      if (settings && typeof settings === 'object') {
        stateProps.forEach(function(prop) {
          grid[prop] = prop === 'sortColumn' ? grid.columns[settings[prop]] : settings[prop]
        })
        if (Array.isArray(settings.filters)) {
          grid.columns.forEach(function(col, colIdx) {
            if ('filterValue' in col) {
              col.filterValue = settings.filters[colIdx]
            }
          })
        }
      }

      computed(function() {
        var gridState = {
          filters: grid.columns.map(col => col.filterValue)
        }
        stateProps.forEach(function(prop) {
          gridState[prop] = prop === 'sortColumn' ? grid.columns.indexOf(grid[prop]) : grid[prop]
        })

        if (firstCall) {
          firstCall = false
          return
        }
        settingStorage(gridState)
      }, true)
    }

    if (asyncronous) {
      var
        outstandingRequest,
        criteriaChangedDuringRequest = false,
        skip = mobx.observable(0)

      // infinite scrolling
      computed(function() {
        var
          itemCount = /* TODO ko.utils.peekObservable */sortedItems.length,
          rowCount = grid.visibleRowCount
        if (itemCount > rowCount && itemCount - grid.offset < rowCount * 2) {
          skip.set(itemCount)
        }
      }, 5)

      var criteria = computed(function() {
        var cols = grid.columns,
        crit = {
          searchTerm: grid.searchTerm,
          filters: cols.map(col => col.filterValue),
          sortColumn: cols.indexOf(grid.sortColumn) === -1 ? undefined : grid.sortColumn,
          sortAscending: grid.sortAscending
        }
        if (typeof params.additionalCriteria === 'function') {
          Object.assign(crit, params.additionalCriteria(grid))
        }

        return crit
      })

      computed(function() {
        criteria.get()
        if (!reordered) {
          skip.set(0)
        }
      }, true)

      computed(function fetchData() {
        var crit = criteria.get()
        crit.skip = skip.get() // always take a dependency on these

        if (reordered) {
          reordered = false
          return outstandingRequest
        }

        mobx.untracked(function() {
          if (!outstandingRequest) {
            outstandingRequest = unwrap(params.data).call(grid, crit)
            if (!outstandingRequest || typeof outstandingRequest.then !== 'function') {
              throw new Error('A promise was not returned from the data function')
            }

            grid.outstandingRequest = outstandingRequest
            function notify() {
              grid.outstandingRequest = outstandingRequest = null
              if (criteriaChangedDuringRequest) {
                criteriaChangedDuringRequest = false
                fetchData()
              }
            }
            outstandingRequest.then(function(items) {
              if (!Array.isArray(items)) {
                throw new Error('asyncronous request did not result in an array of items but was ' + typeof items)
              }
              if (crit.skip) {
                sortedItems.splice.apply(sortedItems, [crit.skip, 0].concat(items))
              } else {
                sortedItems.replace(items)
              }
              notify()
            }, notify)
          } else {
            criteriaChangedDuringRequest = true
          }
        })
        return outstandingRequest
      }, 1)
    } else {
      var filteredItems = computed(function() {
        var items = unwrap(params.data),
            columns = grid.columns,
            searchTerm = grid.searchTerm

        columns.forEach(function(col) {
          if (col.filterValue !== undefined) {
            items = items.filter(col.filter.bind(col, col.filterValue))
          }
        })

        if (searchTerm && typeof searchTerm === 'string') {
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
      }/* TODO: throttle - maybe?, 50*/)

      sortedItems = computed(function() {
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

      Object.defineProperty(grid, 'sortedItems', {
        enumerable: true,
        get: function() {
          return sortedItems.get()
        }
      })
    }

    grid.items = computed(function() {
      var items = grid.sortedItems

      if (items.length >= grid.visibleRowCount) {
        items = items.slice(grid.offset, grid.offset + grid.visibleRowCount)
      }

      return items
    })
  }

  function textFor(grid, col, item, idx) {
    var val = unwrap(col.text)
    if (typeof val === 'function') {
      return val(item, idx, col) || ''
    }
    return !item || item[val] == null ? '' : String(item[val])
  }

  function getVal(prop, { grid, col, item, idx }) {
    var val = unwrap(col[prop])
    if (typeof val === 'function') {
      return val(item, idx, col) || ''
    }
    return val == null ? '' : String(val)
  }

  var key = '1',

  FrypanText = component({
    render: function() {
      // TODO: search <em> highlighting
      var text = textFor(this.props.grid, this.props.col, this.props.item, this.props.idx),
          term = this.props.grid.searchTerm
      if (typeof term === 'string' && term) {
        text = text.split(term).reduce((arr, t, idx) => {
          if (idx > 0) {
            arr.push(e('em', { key: 'match' + idx }, term))
          }
          arr.push(t)
          return arr
        }, [])
      }

      return this.props.col.link ?
        e('a', { href: getVal('link', this.props) }, text) :
        e('span', null, text)
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
      if (typeof grid.rowClick === 'function') {
        var onClick = function(e) {
          e.preventDefault()
          grid.rowClick(item, e)
        }
      }

      return e('tr', { className, onClick }, grid.columns.map(col => e('td',
        { className: getVal('className', { grid, col, item, idx }), key: 'td' + col.name },
        e(col.component || FrypanText, { grid, col, item, idx, key: 'tdc' + col.name })))
      )
    }
  }),

  FrypanTbody = component({
    componentDidMount: function() {
      var
        component = this,
        tbody = component.tbody,
        table = tbody.parentElement,
        scrollArea = table.parentElement,
        frypan = scrollArea.parentElement,
        frypanStyle = getComputedStyle(frypan),
        overflowY = frypanStyle['overflow-y'],
        grid = this.props.grid,
        thead = table.querySelector('thead'),
        td = table.querySelector('tbody td'),
        rowHeight,
        waitForFirstItem,
        recalcOnColChange, recalcOnFirstData,
        virtualized = overflowY === 'auto' || overflowY === 'scroll'

      if (virtualized) {
        var
          topSpacer = table.querySelector('.frypan-top-spacer'),
          bottomSpacer = table.querySelector('.frypan-bottom-spacer')

        if (!td) {
          waitForFirstItem = mobx.autorunAsync(function() {
            td = grid.sortedItems && table.querySelector('tbody td')
            if (td) {
              waitForFirstItem()
              setup.call(this)
            }
          }, 1)
          // setup will create a new dispose function, but we dispose
          // of this one right before that, just in case a td never shows up
          component.dispose = waitForFirstItem
        } else {
          setup.call(this)
        }
      } else if (grid.resizableColumns) {
        if (!td) {
          waitForFirstItem = mobx.reaction(
            () => grid.sortedItems,
            () => { waitForFirstItemsDispose(); setTimeout(pegWidths, 1) }
          )
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
          grid.columns.forEach(c => c.width = null)
        }

        var thWidths = Array.prototype.map.call(thead.firstElementChild.childNodes, function(th) {
          return th.offsetWidth
        }),
        tdWidths = Array.prototype.map.call(tbody.firstElementChild ? tbody.firstElementChild.childNodes : [], function(td) {
          return td.offsetWidth
        }),
        columns = grid.columns

        for (var i = 0; i < columns.length; i++) {
          columns[i].width = Math.max(thWidths[i] || 0, tdWidths[i] || 0)
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
          recalcOnColChange = mobx.autorunAsync(function () {
            grid.columns && recalcColWidths()
            if (!recalcOnFirstData) {
              recalcOnFirstData = mobx.reaction(
                () => grid.sortedItems,
                () => {
                  recalcOnFirstData()
                  recalcOnFirstData = null
                  recalcColWidths()
                }
              )
            }
          }, 1)
        }
        recalcColWidths()

        table.style['table-layout'] = 'fixed'
        table.style['border-spacing'] = '0'
        table.style.width = '1px'
      }

      function setup() {
        rowHeight = Math.max(td.offsetHeight, 2)
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
        var updater = mobx.autorun(updateOffset)
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
              var delta = window.innerWidth - sizeAtStart,
                  d = Math.floor(delta / grid.columns.length)
              sizeAtStart = window.innerWidth

              grid.columns.forEach((col, i) => col.width = Math.max(col.width + d + (i === 0 ? delta % len : 0), grid.minColWidth))
            }, 100)
          }
        }
        window.addEventListener('resize', resizeListener)

        component.dispose = function() {
          updater && updater()
          recalcOnColChange && recalcOnColChange()
          recalcOnFirstData && recalcOnFirstData()
          window.removeEventListener('resize', resizeListener)
        }
      }

      function updateVisibleRowCount() {
        grid.visibleRowCount = Math.ceil((scrollArea.clientHeight - thead.offsetHeight - 1) / rowHeight) + 1
      }

      function updateOffset(e) {
        var
          offset = Math.floor(Math.max(0, scrollArea.scrollTop) / rowHeight),
          topSpacerHeight = (offset * rowHeight) + thead.offsetHeight,
          currOffset = mobx.untracked(() => grid.offset)

        grid.offset = offset
        topSpacer.style.height = topSpacerHeight + 'px'
        bottomSpacer.style.height = Math.max(0, (grid.sortedItems.length - offset - grid.visibleRowCount) * rowHeight) + 'px'
        thead.style.left = -scrollArea.scrollLeft + 'px'
      }
    },

    componentWillUnmount: function() {
      this.dispose && this.dispose()
    },

    render: function() {
      var grid = this.props.grid
      return e('tbody', { key: 'maintbody', ref: e => this.tbody = e }, grid.items.get().map(
        (item, idx) => e(FrypanRow, { grid, item, idx, key: 'tr' + (idx + grid.offset) }))
      )
    }
  }),

  FrypanTh = component({
    render: function() {
      var { col, grid, idx } = this.props,
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
      if (col.filterComponent) {
        children.push(e('a', {
          className: 'frypan-filter-toggle',
          key: 'frypan-filter-toggle',
          onClick: function(e) {
            e.preventDefault()
            grid.showFilters = grid.showFilters === idx ? undefined : idx
          }
        }, grid.filterToggleComponent && e(grid.filterToggleComponent, { col, grid, key: 'filter-toggle-comp' })))

        children.push(e(col.filterComponent, { col, grid, key: 'filtercomp', className: 'frypan-filters' }))
      }

      if (grid.resizableColumns) {
        // TODO: <a class="frypan-resizer" data-bind="frypanResizer: $data.width"></a>
      }

      return e('th', {
        className: [
          getVal('className', { col, grid }),
          col.filterValue !== undefined && 'frypan-filtered',
          grid.showFilters === idx && 'frypan-filter-open'
        ].filter(x => x).join(' '),
        'aria-sort': grid.sortColumn === col ? (grid.sortAscending ? 'ascending' : 'descending') : undefined,
        style: {
          width: col.width ? (col.width + 'px') : ''
        }
      }, children)
    }
  }),

  Frypan = component({
    componentWillMount: function() {
      init(this, this.props)
    },

    componentWillUnmount: function() {
      this.disposables.forEach(function(d) { d() })
    },

    render: function() {
      var grid = this
          //, theadWidth = grid.columns.reduce((w, c) => w + c.width, 0)
      return e('frypan', null,
        e('div', { className: 'frypan-scroll-area', key: 'scroll-area' }, [
          e('table', { key: 'the-table', }, [
            e('colgroup', { key: 'the-colgroup' },
              grid.columns.map(function(c) {
                return e('col', { style: { width: c.width ? c.width + 'px' : undefined }, key: 'col-' + c.name })
              })
            ),
            e('thead', { /*width: theadWidth,*/ key: 'the-head' }, [
              e('tr', { key: 'tr' }, grid.columns.map((col, idx) => e(FrypanTh, { col, grid, idx, key: 'th' + String(idx) })))
            ]),
            e('tbody', { className: 'frypan-top-spacer', style: { display: 'none' }, key: 'top-spacer' }),
            e(FrypanTbody, { grid, key: 'frypan-body' }),
            e('tbody', { className: 'frypan-bottom-spacer', style: { display: 'none' }, key: 'bottom-spacer' }),
          ])
        ]),
        e('div', { className: 'frypan-loader ' + (grid.outstandingRequest ? 'frypan-loading' : ''), key: 'frypan-loading' }, grid.loadingComponent)
      )
    }
  })

  Frypan.Text = FrypanText

  return Frypan
})