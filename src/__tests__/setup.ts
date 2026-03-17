import '@testing-library/jest-dom';

// Initialize DOM for integration tests
if (typeof document === 'undefined') {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
  });
  global.document = dom.window.document;
  global.window = dom.window as any;
}
