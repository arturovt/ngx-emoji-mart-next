describe('test environment', () => {
  it('should run without zone.js', () => {
    expect('Zone' in window).toBe(false);
  });
});
