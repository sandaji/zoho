// Quick debug script to decode JWT token
const jwt = require('jsonwebtoken');

// Replace this with your actual JWT token from localStorage
const token = process.argv[2];

if (!token) {
  console.error('Usage: node debug-token.js <your-jwt-token>');
  process.exit(1);
}

try {
  const decoded = jwt.decode(token);
  console.log('Decoded JWT:');
  console.log(JSON.stringify(decoded, null, 2));
  console.log('\nRole:', decoded.role);
  console.log('Is Admin:', decoded.role === 'admin');
} catch (error) {
  console.error('Error decoding token:', error.message);
}
