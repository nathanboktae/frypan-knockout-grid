describe('reordering', function() {
  it('should not allow reordering by default')
  it('should allow the user to drag and reorder a column to the right')
  it('should allow the user to drag and reorder a column to the left')
  it('should allow the user to drag and reorder a column to a target that causes a scroll')
  it('should not reload data when a column is reordered with asyncrounous sources')
  it('should allow infinite scroll to keep working after a column is reordered')

  describe('dragging', function() {
    it('should create a ghost item that tracks with the mouse movement')
    it('should add a class on the source and drop target, moving the class as the mouse moves')
    it('should not reorder a column if dropped outside the header')
  })
})
