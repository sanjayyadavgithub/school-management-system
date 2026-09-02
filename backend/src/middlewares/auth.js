const jwt = require('jsonwebtoken');
const User = require('../models/User');
const School = require('../models/School');

// Protect route: Verify token and load tenant context
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtsmskey123!');
    
    // Load full user details
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User matching token no longer exists' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'User account has been deactivated' });
    }

    // Bind user & school context to request
    req.user = user;
    req.schoolId = user.schoolId;

    // Check school active status for non-SuperAdmin
    if (user.role !== 'SuperAdmin') {
      const school = await School.findById(user.schoolId);
      if (!school) {
        return res.status(404).json({ success: false, message: 'Tenant school not found' });
      }
      if (!school.isActive) {
        return res.status(403).json({ success: false, message: 'School tenant is currently suspended' });
      }
    }

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication token' });
  }
};

// Check allowed user roles
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Role (${req.user ? req.user.role : 'Guest'}) is not authorized to access this resource` 
      });
    }
    next();
  };
};

// Validate custom permissions for teachers
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    // Admin & SuperAdmin bypass granular permissions
    if (['SuperAdmin', 'Admin'].includes(req.user.role)) {
      return next();
    }

    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have the required permission: ' + permission 
      });
    }
    next();
  };
};

module.exports = {
  protect,
  restrictTo,
  requirePermission,
};
