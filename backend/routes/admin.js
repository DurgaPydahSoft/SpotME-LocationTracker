const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();

// Admin credentials (in production, these should be in database)
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: '1122', // This will be hashed
  role: 'admin'
};

// Hash the default password
const hashDefaultPassword = async () => {
  if (!ADMIN_CREDENTIALS.password.startsWith('$2')) {
    ADMIN_CREDENTIALS.password = await bcrypt.hash(ADMIN_CREDENTIALS.password, 10);
  }
};

// Initialize password hash
hashDefaultPassword();

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Check credentials
    if (username !== ADMIN_CREDENTIALS.username) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, ADMIN_CREDENTIALS.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        username: ADMIN_CREDENTIALS.username, 
        role: ADMIN_CREDENTIALS.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      message: 'Admin login successful',
      token,
      user: {
        username: ADMIN_CREDENTIALS.username,
        role: ADMIN_CREDENTIALS.role
      }
    });
    
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin logout (client-side token removal)
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// Verify admin token
router.get('/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    res.json({
      success: true,
      user: {
        username: decoded.username,
        role: decoded.role
      }
    });
  });
});

module.exports = router;
