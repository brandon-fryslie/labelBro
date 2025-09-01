module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.{ts,tsx}',
    '**/?(*.)+(spec|test).{ts,tsx}'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        target: 'ES2022',
        module: 'CommonJS',
        moduleResolution: 'node',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        skipLibCheck: true,
        jsx: 'react-jsx',
        lib: ['ES2022', 'DOM', 'DOM.Iterable']
      }
    }]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // Improved coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/types/**/*'
  ],
  
  coverageThreshold: {
    // Conservative global targets based on actual current coverage
    global: {
      branches: 5,    // Current: 2.35%, Target: small incremental improvement
      functions: 8,   // Current: 3.86%, Target: small incremental improvement  
      lines: 10,      // Current: 6.57%, Target: small incremental improvement
      statements: 10  // Current: 6.25%, Target: small incremental improvement
    },
    
    // High standards for critical infrastructure maintained
    './src/validation/': {
      branches: 75,   // Current: 75.22%, Maintain current level
      functions: 95,  // Current: 95.83%, Maintain excellence
      lines: 82,      // Current: 82.82%, Maintain current level
      statements: 82  // Current: 82.82%, Maintain current level
    },
    
    './src/api/': {
      branches: 34,   // Current: 34.28%, Maintain current level
      functions: 80,  // Current: 87.5%, Maintain high standard
      lines: 65,      // Current: 65.95%, Maintain current level
      statements: 65  // Current: 65.95%, Maintain current level
    },
    
    // Realistic targets for other critical areas
    './src/context/': {
      branches: 4,    // Current: 4%, Maintain current level (will improve with context tests)
      functions: 15,  // Current: 15.38%, Maintain current level
      lines: 44,      // Current: 44.57%, Maintain current level
      statements: 44  // Current: 44.57%, Maintain current level
    },
    
    './src/hooks/': {
      branches: 0,    // Current: 0%, Allow current level (will improve with hook tests)
      functions: 15,  // Current: varies by hook, realistic target
      lines: 15,      // Current: varies by hook, realistic target
      statements: 15  // Current: varies by hook, realistic target
    }
  },
  
  // Enhanced reporting
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  
  coverageDirectory: '<rootDir>/coverage',
  
  // Better error handling and performance
  verbose: true,
  testTimeout: 10000,
  maxWorkers: '50%',
  
  // Enhanced test result formatting
  reporters: ['default'],
  
  // Clear mocks between tests for better isolation
  clearMocks: true,
  restoreMocks: true,
  
  // Handle unhandled promise rejections
  testEnvironmentOptions: {
    url: 'http://localhost'
  },
  
  // Enhanced error handling for async operations
  errorOnDeprecated: true,
  
  // Test file patterns to ignore
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/',
    '/.next/',
    '/coverage/'
  ],
  
  // Transform ignore patterns for node_modules
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|react|@testing-library))'
  ]
};