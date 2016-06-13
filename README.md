## Frypan

[![Join the chat at https://gitter.im/nathanboktae/frypan-knockout-grid](https://badges.gitter.im/nathanboktae/frypan-knockout-grid.svg)](https://gitter.im/nathanboktae/frypan-knockout-grid?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

### A lightweight and powerful data grid for Knockout

[![SauceLabs Test Status](https://saucelabs.com/browser-matrix/frypan-knockout-grid.svg)](https://saucelabs.com/u/frypan-knockout-grid)

### Features

- Column sorting
- Column filtering
- Searching
- Automatic Virtualization if needed, with automatic resizing
- Infinite Scrolling
- Custom column templates, with built-in one for link rendering
- Column resizing
- Column drag and drop reordering
- Asyncrounous (Remote) data sources
- Persists and load settings to local storage or anywhere else
- Dynamic column discovery - an array of objects (or async data function) is all you need to get started
- No event soup - everything is wrapped in computed observables. Everything just works when your data and options change

### API

#### `data`

If `data` is an array or observable array, frypan operates in syncrounous mode - Using this array as the data source, it will automatically sort columns and filter columns based on the `searchTerm`.

If `data` is a non-observable function, frypan operates in an asyncrounous mode. Frypan will call this function with the search criteria - `searchTerm`, what column is sorted on (if any), etc. This function must return a promise that resolves to an array. Frypan will also display loading markup while a request is in flight.

#### `columns`

An optional array of objects to specify columns. You may specify any number of optional params:

- `text`: If a string, the property to use as the string. If a function, it takes in the row object and index and returns the string to use as the text.
- `link`: Similar to `text`, a string or function to specify the anchor. `text` will be used inside the anchor in that case.
- `sort`: A function to call to sort rows in the table when sorted on. Frypan will invert the results when sorting descending.
- `class`: string or function to specify the class on the `td`.
- `template`: the string to use as the template (use instead of `text` or `link`). Optionally can be specified in the view (see below).
- `filter`: a function that given the column filter, item, and item index, returns true or false if it should be included. See Filtering below.
- `filterTemplate`: The template for the column filter UI. See Filtering below.

Additionally columns may be defined in markup using the `frypan-column` tag like so:

```html
<frypan-column><span class="fruit" data-bind="text: fruit"></span></frypan-column>
```

You can mix and max column definitions with code and html so that presentation and function can be cleanly separated

```javascript
var frypanParams = {
  columns: [{
    name: 'fruit',
    sort: (a, b) => a.fruit > b.fruit ? -1 : 1
  }]
}
```

```html
<frypan-column name="fruit"><span class="fruit" data-bind="text: fruit"></span></frypan-column>
```

Here the sort function from the view model will be used, and the template from the view will be used on the same column as they are matched via the `name` attribute on `frypan-column`.

Additionally, if columns are completely omitted, frypan will automatically create columns based on the properties of the first object in the result set (including asyncrounously!).

See the [column tests](https://github.com/nathanboktae/frypan-knockout-grid/blob/master/tests/column-templates.js) for more information.

#### `searchTerm`

An observable to use to search and filter on properties. Automatic filtering of properties is based on the `text` option of the column.

Note that Frypan doesn't provide a search UI; thus the ability for the observable to be passed in, wired up to your own custom search UI. This is because there's no natural place to put it inside the table, so it's up to the user where they want it.

#### `resizableColumns`

Set truthy (or an observable that is truthy) to enable column resizing (default is off). Resizers will be available in the headers for the user to resize.

#### `reorderableColumns`

Set truthy (or an observable that is truthy) to enable column reordering (default is off). The user will be able to click and drag a column to resize it.

When reordering, frypan will add the `frypan-move-source` class to the column that is being moved, and `frypan-move-target` the user is hovering over (it will be inserted before this column). Additionally frypan clones the `th` that the user is dragging and adds a `frypan-move-ghost` class to it.

#### `minColWidth`

Specifies the minimum column width when using resizable columns. Defaults to 40. This cannot be an observable currently.


### Filtering

Documentation to come. See [filtering tests](https://github.com/nathanboktae/frypan-knockout-grid/blob/master/tests/filtering.js) for now.

### Virtualization

Documentation to come. See [virtualization tests](https://github.com/nathanboktae/frypan-knockout-grid/blob/master/tests/virtualization.js) and the [virtualization example](https://github.com/nathanboktae/frypan-knockout-grid/blob/master/examples/virtualization.html) for now.

### Installation

via bower

```
bower install frypan-knockout-grid
```

or via npm

```
npm install frypan-knockout-grid
```