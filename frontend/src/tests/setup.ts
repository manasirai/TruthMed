import '@testing-library/jest-dom';

// Mock Three.js canvas in test environment
Object.defineProperty(window, 'WebGLRenderingContext', {
  value: {},
  writable: true,
});
