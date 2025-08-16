require('dotenv').config();
const express = require('express');
const https = require('https');
const cors = require('cors');
const path = require('path');
const { supabase, TABLES } = require('./config/supabase');
const adminRoutes = require('./routes/admin');
const { authenticateAdmin } = require('./middleware/auth');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Admin routes
app.use('/api/admin', adminRoutes);

// Routes
app.post('/api/location', (req, res) => {
  const { latitude, longitude, accuracy, readingsCount, method } = req.body;
    
    console.log('Location received:', {
        latitude,
        longitude,
            accuracy,
            readingsCount,
            method
    });
  
  res.json({ success: true, message: 'Location received' });
});

app.post('/api/geocode', async (req, res) => {
        const { lat, lng } = req.query;
        
        if (!lat || !lng) {
            return res.status(400).json({ error: 'Latitude and longitude are required' });
        }
        
  try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
        console.log('Fetching location name from:', url);
        
    const data = await new Promise((resolve, reject) => {
      https.get(url, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', () => {
                try {
            const parsedData = JSON.parse(data);
            resolve(parsedData);
          } catch (error) {
            reject(error);
          }
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
    
    console.log('Location name received:', data.display_name);
    res.json(data);
    
  } catch (error) {
    console.error('Error fetching location name:', error);
    res.status(500).json({ error: 'Failed to fetch location name' });
  }
});

// User management endpoints with Supabase
app.post('/api/users', async (req, res) => {
  const { name, id, isActive, lastUpdated } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  
  try {
    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('name', name)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }
    
    if (existingUser) {
      return res.status(409).json({ error: 'User with this name already exists' });
    }
    
    // Create new user
    const { data: newUser, error: insertError } = await supabase
      .from(TABLES.USERS)
      .insert([{
        name,
        id: id || Date.now().toString(),
        is_active: isActive,
        last_updated: lastUpdated || new Date().toISOString(),
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (insertError) {
      throw insertError;
    }
    
    console.log('New user registered in Supabase:', newUser);
    res.json({ success: true, user: newUser });
    
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.post('/api/users/update-location', async (req, res) => {
  const { name, location, lastUpdated } = req.body;
  
  if (!name || !location) {
    return res.status(400).json({ error: 'Name and location are required' });
  }
  
  try {
    // Convert date formats to ISO if needed
    let recordedAt = location.timestamp;
    if (recordedAt && typeof recordedAt === 'string') {
      // Try to parse the date and convert to ISO format
      try {
        const date = new Date(recordedAt);
        if (!isNaN(date.getTime())) {
          recordedAt = date.toISOString();
        } else {
          // If parsing fails, use current time
          recordedAt = new Date().toISOString();
        }
      } catch (dateError) {
        console.warn('Date parsing failed, using current time:', dateError);
        recordedAt = new Date().toISOString();
      }
    } else {
      recordedAt = new Date().toISOString();
    }

    let lastUpdatedISO = lastUpdated;
    if (lastUpdated && typeof lastUpdated === 'string') {
      try {
        const date = new Date(lastUpdated);
        if (!isNaN(date.getTime())) {
          lastUpdatedISO = date.toISOString();
        } else {
          lastUpdatedISO = new Date().toISOString();
        }
      } catch (dateError) {
        lastUpdatedISO = new Date().toISOString();
      }
    } else {
      lastUpdatedISO = new Date().toISOString();
    }
    
    // Update user's last location
    const { data: updatedUser, error: updateError } = await supabase
      .from(TABLES.USERS)
      .update({
        last_updated: lastUpdatedISO
      })
      .eq('name', name)
      .select()
      .single();
    
    if (updateError) {
      throw updateError;
    }
    
    // Insert new location record
    const { data: newLocation, error: locationError } = await supabase
      .from(TABLES.LOCATIONS)
      .insert([{
        user_name: name,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        location_name: location.locationName,
        recorded_at: recordedAt,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (locationError) {
      throw locationError;
    }
    
    console.log('User location updated in Supabase:', { name, location: location.latitude + ',' + location.longitude });
    res.json({ success: true, user: updatedUser, location: newLocation });
    
  } catch (error) {
    console.error('Error updating user location:', error);
    res.status(500).json({ error: 'Failed to update user location' });
  }
});

// Get all active users with their latest location using the view
app.get('/api/users', async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        name,
        is_active,
        created_at,
        last_updated,
        is_tracking,
        admin_tracking_started,
        admin_tracking_started_by,
        admin_tracking_stopped,
        admin_tracking_stopped_by,
        locations (
          latitude,
          longitude,
          accuracy,
          recorded_at,
          location_name
        )
      `)
      .eq('is_active', true)
      .order('last_updated', { ascending: false });
    
    if (error) throw error;
    
    // Transform the data to match frontend expectations
    const transformedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      isActive: user.is_active,
      lastUpdated: user.last_updated,
      isTracking: user.is_tracking || false,
      adminTrackingStarted: user.admin_tracking_started,
      adminTrackingStartedBy: user.admin_tracking_started_by,
      adminTrackingStopped: user.admin_tracking_stopped,
      adminTrackingStoppedBy: user.admin_tracking_stopped_by,
      location: user.locations && user.locations.length > 0 ? {
        latitude: user.locations[0].latitude,
        longitude: user.locations[0].longitude,
        accuracy: user.locations[0].accuracy,
        timestamp: user.locations[0].recorded_at, // Use recorded_at from database
        locationName: user.locations[0].location_name
      } : null
    }));
    
    res.json(transformedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/users/:name', async (req, res) => {
  const { name } = req.params;
  
  try {
    const { data: user, error } = await supabase
      .from('latest_user_locations')
      .select('*')
      .eq('name', name)
      .eq('is_active', true)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'User not found' });
      }
      throw error;
    }
    
    // Transform data
    const transformedUser = {
      name: user.name,
      id: user.id,
      isActive: user.is_active,
      lastUpdated: user.last_updated,
      location: user.latitude && user.longitude ? {
        latitude: user.latitude,
        longitude: user.longitude,
        accuracy: user.accuracy,
        locationName: user.location_name,
        timestamp: user.timestamp
      } : null
    };
    
    res.json(transformedUser);
    
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Delete a specific user
app.delete('/api/users/:name', authenticateAdmin, async (req, res) => {
  const { name } = req.params;
  
  try {
    // Soft delete - mark user as inactive
    const { data: deletedUser, error } = await supabase
      .from('users')
      .update({ 
        is_active: false,
        is_tracking: false // Stop tracking when user is deleted
      })
      .eq('name', name)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    console.log('User deactivated:', name);
    res.json({ success: true, message: 'User deactivated' });
    
  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

// Add clear all users endpoint
app.delete('/api/users/clear-all', authenticateAdmin, async (req, res) => {
  try {
    // Deactivate all users
    const { error } = await supabase
      .from(TABLES.USERS)
      .update({ is_active: false });
    
    if (error) {
      throw error;
    }
    
    console.log('All users deactivated');
    res.json({ success: true, message: 'All users deactivated' });
        
    } catch (error) {
    console.error('Error deactivating all users:', error);
    res.status(500).json({ error: 'Failed to deactivate all users' });
  }
});

app.get('/api/test', async (req, res) => {
  try {
    // Get active user count from Supabase
    const { count, error } = await supabase
      .from(TABLES.USERS)
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    
    if (error) {
      throw error;
    }
    
    res.json({ 
      message: 'Location Tracker server is running with Supabase!',
      timestamp: new Date().toISOString(),
      activeUsers: count || 0,
      database: 'Supabase'
    });
  } catch (error) {
    console.error('Error getting user count:', error);
    res.json({ 
      message: 'Location Tracker server is running!',
      timestamp: new Date().toISOString(),
      activeUsers: 'Error fetching count',
      database: 'Supabase (with errors)'
    });
  }
});

// Get active user count
app.get('/api/stats', async (req, res) => {
  try {
    // Get active user count from Supabase
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    
    if (error) throw error;
    
    res.json({
      activeUsers: count || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      activeUsers: 'Error fetching count',
      timestamp: new Date().toISOString()
    });
  }
});

// Admin tracking control endpoints
app.post('/api/users/start-tracking', authenticateAdmin, async (req, res) => {
  try {
    const { userName } = req.body;
    
    if (!userName) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    // Update user's tracking status in Supabase
    const { error } = await supabase
      .from('users')
      .update({ 
        is_tracking: true,
        admin_tracking_started: new Date().toISOString(),
        admin_tracking_started_by: req.adminUser.name
      })
      .eq('name', userName)
      .eq('is_active', true);
    
    if (error) throw error;
    
    res.json({ 
      success: true, 
      message: `Started tracking for user: ${userName}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error starting tracking for user:', error);
    res.status(500).json({ 
      error: 'Failed to start tracking',
      details: error.message 
    });
  }
});

app.post('/api/users/stop-tracking', authenticateAdmin, async (req, res) => {
  try {
    const { userName } = req.body;
    
    if (!userName) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    // Update user's tracking status in Supabase
    const { error } = await supabase
      .from('users')
      .update({ 
        is_tracking: false,
        admin_tracking_stopped: new Date().toISOString(),
        admin_tracking_stopped_by: req.adminUser.name
      })
      .eq('name', userName)
      .eq('is_active', true);
    
    if (error) throw error;
    
    res.json({ 
      success: true, 
      message: `Stopped tracking for user: ${userName}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error stopping tracking for user:', error);
    res.status(500).json({ 
      error: 'Failed to stop tracking',
      details: error.message 
    });
  }
});

app.get('/api/users/tracking-status', authenticateAdmin, async (req, res) => {
  try {
    // Get tracking status for all active users
    const { data: users, error } = await supabase
      .from('users')
      .select('name, is_tracking, admin_tracking_started, admin_tracking_started_by')
      .eq('is_active', true);
    
    if (error) throw error;
    
    // Convert to tracking states object
    const trackingStates = {};
    users.forEach(user => {
      trackingStates[user.name] = user.is_tracking || false;
    });
    
    res.json(trackingStates);
  } catch (error) {
    console.error('Error fetching tracking status:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tracking status',
      details: error.message 
    });
  }
});

app.post('/api/users/start-all-tracking', authenticateAdmin, async (req, res) => {
  try {
    // Start tracking for all active users
    const { error } = await supabase
      .from('users')
      .update({ 
        is_tracking: true,
        admin_tracking_started: new Date().toISOString(),
        admin_tracking_started_by: req.adminUser.name
      })
      .eq('is_active', true);
    
    if (error) throw error;
    
    res.json({ 
      success: true, 
      message: 'Started tracking for all users',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error starting tracking for all users:', error);
    res.status(500).json({ 
      error: 'Failed to start tracking for all users',
      details: error.message 
    });
  }
});

app.post('/api/users/stop-all-tracking', authenticateAdmin, async (req, res) => {
  try {
    // Stop tracking for all active users
    const { error } = await supabase
      .from('users')
      .update({ 
        is_tracking: false,
        admin_tracking_stopped: new Date().toISOString(),
        admin_tracking_stopped_by: req.adminUser.name
      })
      .eq('is_active', true);
    
    if (error) throw error;
    
    res.json({ 
      success: true, 
      message: 'Stopped tracking for all users',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error stopping tracking for all users:', error);
    res.status(500).json({ 
      error: 'Failed to stop tracking for all users',
      details: error.message 
    });
  }
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Location Tracker Server running on port ${PORT}`);
  console.log(`📍 Open http://localhost:${PORT} in your browser`);
  console.log(`🗄️  Database: Supabase`);
});
