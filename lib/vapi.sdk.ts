import Vapi from '@vapi-ai/web'

// Validate environment variables
const webToken = process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN;

if (!webToken) {
  console.error('NEXT_PUBLIC_VAPI_WEB_TOKEN is not defined in environment variables');
  console.error('Available env vars:', Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_VAPI')));
  throw new Error('VAPI web token is required');
}

console.log('VAPI SDK initialized with token:', webToken.substring(0, 10) + '...');

// Create VAPI instance
export const vapi = new Vapi(webToken);

// Add connection event listeners for debugging
vapi.on('call-start', () => {
  console.log('VAPI: Call started');
});

vapi.on('call-end', () => {
  console.log('VAPI: Call ended');
});

vapi.on('error', (error: any) => {
  console.error('VAPI SDK Error:', error);
  
  // Handle specific error format with data and error keys
  if (error && typeof error === 'object') {
    if (error.data) {
      console.error('VAPI Error Data:', error.data);
    }
    if (error.error) {
      console.error('VAPI Error Details:', error.error);
    }
    if (error.message) {
      console.error('VAPI Error Message:', error.message);
    }
    if (error.statusCode) {
      console.error('VAPI Status Code:', error.statusCode);
    }
  }
});