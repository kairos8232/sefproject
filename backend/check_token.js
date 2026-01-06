// Add this temporarily to the backend to see what's happening
// Check the JWT token and decoded user info

const jwt = require('jsonwebtoken');

// Get token from localStorage (paste it here)
const token = "YOUR_TOKEN_HERE";

try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production');
  console.log('Decoded token:', decoded);
  console.log('User ID:', decoded.userId);
  console.log('Role:', decoded.role);
  console.log('Faculty ID:', decoded.facultyId);
} catch (error) {
  console.error('Invalid token:', error.message);
}
