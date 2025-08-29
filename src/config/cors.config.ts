import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

// CORS configuration options
export const corsOptions: cors.CorsOptions = {
  // Allow multiple origins
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',')
      : [
          'http://localhost:3000',
          'http://localhost:3001', 
          'http://localhost:5173',
          'http://localhost:8080',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:3001',
          'http://127.0.0.1:5173'
        ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`Origin ${origin} not allowed by CORS`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  
  // Allow credentials (cookies, authorization headers, etc.)
  credentials: true,
  
  // Allowed HTTP methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  
  // Allowed headers
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  
  // Expose headers to the client
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  
  // How long the results of a preflight request can be cached
  maxAge: 86400, // 24 hours
  
  // Enable preflight requests for all routes
  preflightContinue: false,
  
  // Send 204 status for preflight requests
  optionsSuccessStatus: 204
};

// Development CORS options (more permissive)
export const devCorsOptions: cors.CorsOptions = {
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['*'],
  exposedHeaders: ['*']
};

// Production CORS options (more restrictive)
export const prodCorsOptions: cors.CorsOptions = {
  origin: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['https://yourdomain.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With'
  ],
  maxAge: 86400
};

// Get CORS options based on environment
export const getCorsOptions = (): cors.CorsOptions => {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return prodCorsOptions;
    case 'development':
      return devCorsOptions;
    default:
      return corsOptions;
  }
};
