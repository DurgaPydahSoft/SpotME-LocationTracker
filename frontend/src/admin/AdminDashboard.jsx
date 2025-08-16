import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

// Font imports
const fontStyle = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Text:ital@0;1&family=Quicksand:wght@300..700&display=swap');
`

const AdminDashboard = () => {
  const navigate = useNavigate()
  const [activeUsers, setActiveUsers] = useState([])
  const [mapInstance, setMapInstance] = useState(null)
  const [markers, setMarkers] = useState({})
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null) // Track selected user
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [adminUser, setAdminUser] = useState(null)
  const mapRef = useRef(null)
  const leafletLoadedRef = useRef(false)
  const [expandedUser, setExpandedUser] = useState(null) // Track which user card is expanded
  const [miniMapStates, setMiniMapStates] = useState({}) // Track mini map states
  
  // Use refs to store mini map instances to avoid React state issues
  const miniMapRefs = useRef({})
  
  // Admin tracking control state
  const [userTrackingStates, setUserTrackingStates] = useState({}) // Track which users are being tracked by admin
  const [trackingControlLoading, setTrackingControlLoading] = useState({}) // Loading states for tracking controls

  // Color palette for different users - using vibrant, distinct colors for better differentiation
  const markerColors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#96CEB4', // Green
    '#FFEAA7', // Yellow
    '#DDA0DD', // Plum
    '#98D8C8', // Mint
    '#F7DC6F', // Gold
    '#BB8FCE', // Purple
    '#85C1E9', // Sky Blue
    '#F8C471', // Orange
    '#82E0AA', // Light Green
    '#F1948A', // Pink
    '#74B9FF', // Light Blue
    '#FAD7A0'  // Peach
  ]

  // Function to get color for a user
  const getUserColor = (userName) => {
    let hash = 0
    for (let i = 0; i < userName.length; i++) {
      hash = userName.charCodeAt(i) + ((hash << 5) - hash)
    }
    const index = Math.abs(hash) % markerColors.length
    return markerColors[index]
  }

  // Function to handle user selection
  const handleUserSelect = (user) => {
    if (selectedUser && selectedUser.name === user.name) {
      // If clicking the same user, deselect (show all users)
      setSelectedUser(null)
      // Clean up mini map if it was expanded
      if (expandedUser) {
        cleanupMiniMap(expandedUser)
        setExpandedUser(null)
      }
    } else {
      // If there was a previously expanded user, clean it up first
      if (expandedUser) {
        cleanupMiniMap(expandedUser)
      }
      // Select the clicked user
      setSelectedUser(user)
      setExpandedUser(user.name) // Expand the selected user card
    }
  }

  // Function to clear user selection
  const clearUserSelection = () => {
    // Clean up mini map if any user was expanded
    if (expandedUser) {
      cleanupMiniMap(expandedUser)
      setExpandedUser(null)
    }
    setSelectedUser(null)
  }

  // Admin tracking control functions
  const startUserTracking = async (userName) => {
    try {
      setTrackingControlLoading(prev => ({ ...prev, [userName]: true }))
      
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/users/start-tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userName })
      })
      
      if (response.ok) {
        // Update local state
        setUserTrackingStates(prev => ({ ...prev, [userName]: true }))
        console.log(`Started tracking for user: ${userName}`)
      } else {
        throw new Error('Failed to start tracking')
      }
    } catch (error) {
      console.error('Error starting tracking for user:', error)
      alert(`Failed to start tracking for ${userName}. Please try again.`)
    } finally {
      setTrackingControlLoading(prev => ({ ...prev, [userName]: false }))
    }
  }

  const stopUserTracking = async (userName) => {
    try {
      setTrackingControlLoading(prev => ({ ...prev, [userName]: true }))
      
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/users/stop-tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userName })
      })
      
      if (response.ok) {
        // Update local state
        setUserTrackingStates(prev => ({ ...prev, [userName]: false }))
        console.log(`Stopped tracking for user: ${userName}`)
      } else {
        throw new Error('Failed to stop tracking')
      }
    } catch (error) {
      console.error('Error stopping tracking for user:', error)
      alert(`Failed to stop tracking for ${userName}. Please try again.`)
    } finally {
      setTrackingControlLoading(prev => ({ ...prev, [userName]: false }))
    }
  }

  // Check user tracking status on load
  const checkUserTrackingStatus = async () => {
    try {
      // Instead of calling a separate endpoint, we'll use the data from loadUsers
      // The tracking status is now included in the user data
      console.log('Tracking status will be updated from user data')
    } catch (error) {
      console.error('Error checking user tracking status:', error)
    }
  }

  // Bulk tracking control functions
  const startAllUserTracking = async () => {
    try {
      if (activeUsers.length === 0) return
      
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/users/start-all-tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        // Update local state for all users
        const allUsersTracking = {}
        activeUsers.forEach(user => {
          allUsersTracking[user.name] = true
        })
        setUserTrackingStates(allUsersTracking)
        console.log('Started tracking for all users')
      } else {
        throw new Error('Failed to start tracking for all users')
      }
    } catch (error) {
      console.error('Error starting tracking for all users:', error)
      alert('Failed to start tracking for all users. Please try again.')
    }
  }

  const stopAllUserTracking = async () => {
    try {
      if (activeUsers.length === 0) return
      
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/users/stop-all-tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        // Update local state for all users
        const allUsersNotTracking = {}
        activeUsers.forEach(user => {
          allUsersNotTracking[user.name] = false
        })
        setUserTrackingStates(allUsersNotTracking)
        console.log('Stopped tracking for all users')
      } else {
        throw new Error('Failed to stop tracking for all users')
      }
    } catch (error) {
      console.error('Error stopping tracking for all users:', error)
      alert('Failed to stop tracking for all users. Please try again.')
    }
  }

  // Function to toggle user card expansion
  const toggleUserExpansion = (userName) => {
    if (expandedUser === userName) {
      // Collapse the current user
      setExpandedUser(null)
      // Clean up mini map state and instance
      cleanupMiniMap(userName)
    } else {
      // If there was a previously expanded user, clean it up first
      if (expandedUser) {
        cleanupMiniMap(expandedUser)
      }
      // Expand the new user
      setExpandedUser(userName)
      // Initialize mini map state
      setMiniMapStates(prev => ({
        ...prev,
        [userName]: { loading: true, error: false }
      }))
    }
  }

  // Function to clean up mini map for a specific user
  const cleanupMiniMap = (userName) => {
    try {
      // Remove map instance if it exists
      if (miniMapRefs.current[userName]) {
        if (typeof miniMapRefs.current[userName].remove === 'function') {
          miniMapRefs.current[userName].remove()
        }
        delete miniMapRefs.current[userName]
      }
      
      // Clean up state
      setMiniMapStates(prev => {
        const newStates = { ...prev }
        delete newStates[userName]
        return newStates
      })
    } catch (error) {
      console.error('Error cleaning up mini map for', userName, ':', error)
    }
  }

  // Effect to handle mini map creation when users are expanded
  useEffect(() => {
    if (expandedUser && window.L && mapInstance) {
      const user = activeUsers.find(u => u.name === expandedUser)
      if (user && user.location) {
        // Check if map already exists for this user
        if (miniMapRefs.current[expandedUser]) {
          console.log('Mini map already exists for', expandedUser, 'skipping creation')
          return
        }
        
        // Small delay to ensure DOM is ready
        const timer = setTimeout(() => {
          createMiniMap(expandedUser, user)
        }, 100)

        return () => clearTimeout(timer)
      }
    }
  }, [expandedUser, activeUsers, mapInstance])

  // Function to create mini map for a specific user
  const createMiniMap = (userName, user) => {
    try {
      // Safety check: make sure this user is still expanded
      if (expandedUser !== userName) {
        console.log('User', userName, 'is no longer expanded, skipping map creation')
        return
      }

      const mapContainer = document.getElementById(`mini-map-${userName}`)
      if (!mapContainer) {
        setMiniMapStates(prev => ({
          ...prev,
          [userName]: { loading: false, error: true, errorMessage: 'Map container not found' }
        }))
        return
      }

      // Check if container already has a map
      if (mapContainer._leaflet_id) {
        console.log('Map container already initialized for', userName, 'skipping creation')
        return
      }

      // Create mini map
      const miniMap = window.L.map(mapContainer).setView([user.location.latitude, user.location.longitude], 12)
      
      // Add OpenStreetMap tiles
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(miniMap)

      // Add user marker
      const userColor = getUserColor(user.name)
      const customIcon = window.L.divIcon({
        html: `<div style="
          background-color: ${userColor};
          width: 24px;
          height: 24px;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 14px;
          text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
        ">${user.name.charAt(0).toUpperCase()}</div>`,
        className: 'custom-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      })

      window.L.marker([user.location.latitude, user.location.longitude], { icon: customIcon }).addTo(miniMap)

      // Store mini map instance in refs to avoid React state issues
      miniMapRefs.current[userName] = miniMap

      // Mark as loaded
      setMiniMapStates(prev => ({
        ...prev,
        [userName]: { loading: false, error: false }
      }))

      // Force map refresh
      setTimeout(() => {
        try {
          if (miniMap && typeof miniMap.invalidateSize === 'function') {
            miniMap.invalidateSize()
          }
        } catch (error) {
          console.error('Error refreshing mini map:', error)
        }
      }, 200)

    } catch (error) {
      console.error('Error creating mini map for', userName, ':', error)
      setMiniMapStates(prev => ({
        ...prev,
        [userName]: { loading: false, error: true, errorMessage: error.message }
      }))
    }
  }

  // Cleanup function for component unmount
  useEffect(() => {
    return () => {
      // Clean up all mini maps
      Object.keys(miniMapRefs.current).forEach(userName => {
        try {
          if (miniMapRefs.current[userName] && typeof miniMapRefs.current[userName].remove === 'function') {
            miniMapRefs.current[userName].remove()
          }
        } catch (error) {
          console.error('Error cleaning up map during unmount:', error)
        }
      })
      // Clear the refs
      miniMapRefs.current = {}
      
      // Clean up main map
      if (mapInstance && typeof mapInstance.remove === 'function') {
        try {
          mapInstance.remove()
        } catch (error) {
          console.error('Error cleaning up main map during unmount:', error)
        }
      }
    }
  }, [mapInstance])

  // Cleanup effect when users change
  useEffect(() => {
    // Clean up any expanded maps when users change
    if (expandedUser) {
      const userExists = activeUsers.some(u => u.name === expandedUser)
      if (!userExists) {
        cleanupMiniMap(expandedUser)
        setExpandedUser(null)
      }
    }
  }, [activeUsers, expandedUser])

  // Load active users from Supabase backend
  const loadUsers = async () => {
    try {
      setLoading(true)
      console.log('Fetching users from backend...')
      
      const response = await fetch('/api/users')
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error response:', errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const users = await response.json()
      console.log('Users received:', users)
      setActiveUsers(users)
      setError(null)
      
      // Update tracking states from user data
      const trackingStates = {}
      users.forEach(user => {
        trackingStates[user.name] = user.isTracking || false
      })
      setUserTrackingStates(trackingStates)
      
    } catch (err) {
      console.error('Error loading users:', err)
      setError(`Failed to load users: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('adminToken')
      const user = localStorage.getItem('adminUser')
      
      if (token && user) {
        try {
          // Verify token with backend
          fetch('/api/admin/verify', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }).then(response => {
            if (response.ok) {
              setIsAuthenticated(true)
              setAdminUser(JSON.parse(user))
            } else {
              // Token invalid, redirect to login
              localStorage.removeItem('adminToken')
              localStorage.removeItem('adminUser')
              navigate('/')
            }
          }).catch(() => {
            // Network error, redirect to login
            localStorage.removeItem('adminToken')
            localStorage.removeItem('adminUser')
            navigate('/')
          })
        } catch (error) {
          localStorage.removeItem('adminToken')
          localStorage.removeItem('adminUser')
          navigate('/')
        }
      } else {
        // No token, redirect to login
        navigate('/')
      }
    }
    
    checkAuth()
  }, [navigate])

  useEffect(() => {
    if (!isAuthenticated) return // Don't load data if not authenticated
    
    // Load initially
    loadUsers()

    // Set up interval to refresh every 15 seconds
    const interval = setInterval(loadUsers, 15000)

    // Make clearUserSelection available globally for legend button
    window.clearUserSelection = clearUserSelection

    return () => {
      clearInterval(interval)
      delete window.clearUserSelection
    }
  }, [isAuthenticated])

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || isMapLoaded) return

    // Load Leaflet CSS only once
    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    // Load Leaflet JS only once
    if (!leafletLoadedRef.current) {
      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = () => {
        leafletLoadedRef.current = true
        if (mapRef.current && !mapInstance) {
          initMap()
        }
      }
      document.head.appendChild(script)
    } else if (mapRef.current && !mapInstance) {
      initMap()
    }

    return () => {
      if (mapInstance) {
        mapInstance.remove()
        setMapInstance(null)
      }
    }
  }, [mapRef.current, isMapLoaded])

  const initMap = () => {
    if (!window.L || mapInstance || !mapRef.current) return

    try {
      // Check if container already has a map
      if (mapRef.current._leaflet_id) {
        console.log('Map container already initialized, skipping...')
        return
      }

      // Create map centered on a default location with wider zoom for better overview
      const map = window.L.map(mapRef.current).setView([20.5937, 78.9629], 4) // Center of India with wider zoom out view
      
      // Add OpenStreetMap tiles
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map)

      // Add custom CSS for markers
      const style = document.createElement('style')
      style.textContent = `
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }
        .map-legend {
          z-index: 1000;
        }
      `
      document.head.appendChild(style)

      setMapInstance(map)
      setIsMapLoaded(true)
      console.log('Admin map initialized successfully')
    } catch (error) {
      console.error('Error initializing admin map:', error)
    }
  }

  // Update map markers when users change
  useEffect(() => {
    if (!mapInstance || !window.L || !isMapLoaded) return

    // Clear existing markers
    Object.values(markers).forEach(marker => {
      if (marker && mapInstance.hasLayer(marker)) {
        mapInstance.removeLayer(marker)
      }
    })

    const newMarkers = {}
    const validLocations = []

    // Add markers for each active user
    const usersToShow = selectedUser ? [selectedUser] : activeUsers
    
    usersToShow.forEach(user => {
      console.log('Processing user for marker:', user) // Debug log
      if (user.location && 
          user.location.latitude && 
          user.location.longitude &&
          !isNaN(user.location.latitude) && 
          !isNaN(user.location.longitude) &&
          user.location.latitude >= -90 && 
          user.location.latitude <= 90 &&
          user.location.longitude >= -180 && 
          user.location.longitude <= 180) {
        
        try {
          console.log(`Creating marker for ${user.name} at [${user.location.latitude}, ${user.location.longitude}]`) // Debug log
          
          // Create custom colored marker
          const userColor = getUserColor(user.name)
          const customIcon = window.L.divIcon({
            html: `<div style="
              background-color: ${userColor};
              width: 32px;
              height: 32px;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 5px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 16px;
              text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
            ">${user.name.charAt(0).toUpperCase()}</div>`,
            className: 'custom-marker',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          })
          
          const marker = window.L.marker([user.location.latitude, user.location.longitude], { icon: customIcon })
            .addTo(mapInstance)
            .bindPopup(createPopupContent(user), { maxWidth: 300 })
          
          // Add click event to refresh popup content
          marker.on('click', () => {
            marker.getPopup().setContent(createPopupContent(user))
          })
          
          newMarkers[user.name] = marker
          validLocations.push([user.location.latitude, user.location.longitude])
          
          // Open popup for the first user to show it's working
          if (usersToShow.length === 1) {
            marker.openPopup()
          }
        } catch (error) {
          console.error(`Error creating marker for ${user.name}:`, error)
        }
      } else {
        console.log(`Skipping marker for ${user.name} - invalid location data:`, user.location) // Debug log
      }
    })

    setMarkers(newMarkers)

    // Create/update legend
    createLegend()

    // Fit map bounds to show all markers (only if we have valid locations)
    if (validLocations.length > 0) {
      try {
        const bounds = window.L.latLngBounds(validLocations)
        if (bounds.isValid()) {
          mapInstance.fitBounds(bounds, { padding: [50, 50] })
        } else {
          console.log('Invalid bounds, centering on first user instead')
          const firstLocation = validLocations[0]
          mapInstance.setView(firstLocation, 15)
        }
      } catch (error) {
        console.error('Error fitting bounds:', error)
        // Fallback: center on first valid location
        if (validLocations.length > 0) {
          mapInstance.setView(validLocations[0], 15)
        }
      }
    }
  }, [activeUsers, mapInstance, isMapLoaded, selectedUser])

  const createPopupContent = (user) => {
    console.log('Creating popup for user:', user) // Debug log
    
    // Safely extract values with fallbacks
    const userName = user?.name || 'Unknown User'
    const lastUpdated = user?.lastUpdated ? new Date(user.lastUpdated).toLocaleString() : 'Unknown'
    const locationName = user?.location?.locationName || 'Coordinates only'
    
    console.log('Extracted values:', { userName, lastUpdated, locationName }) // Debug log
    
    return `
      <div style="text-align: center; max-width: 280px;">
        <strong>👤 ${userName}</strong><br>
        <div style="margin: 8px 0; padding: 8px; background: #f8f9fa; border-radius: 6px; font-size: 12px; line-height: 1.4;">
          ${locationName}
        </div>
        <small><strong>Last Updated:</strong> ${lastUpdated}</small>
      </div>
    `
  }

  // Function to create map legend
  const createLegend = () => {
    if (!mapInstance || activeUsers.length === 0) return
    
    // Remove existing legend if any
    const existingLegend = document.querySelector('.map-legend')
    if (existingLegend) {
      existingLegend.remove()
    }
    
    // Create legend container
    const legend = window.L.control({ position: 'bottomright' })
    
    legend.onAdd = function() {
      const div = window.L.DomUtil.create('div', 'map-legend')
      div.style.backgroundColor = 'white'
      div.style.padding = '10px'
      div.style.borderRadius = '8px'
      div.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)'
      div.style.minWidth = '200px'
      div.style.fontSize = '12px'
      
      const usersToShow = selectedUser ? [selectedUser] : activeUsers
      const title = selectedUser ? `👤 ${selectedUser.name} - Individual Tracking` : '👥 All Users'
      
      div.innerHTML = `
        <h4 style="margin: 0 0 10px 0; color: #333; font-size: 14px;">${title}</h4>
        ${usersToShow.map(user => {
          const color = getUserColor(user.name)
          return `
            <div style="display: flex; align-items: center; margin: 5px 0;">
              <div style="
                background-color: ${color};
                width: 20px;
                height: 20px;
                border: 2px solid white;
                border-radius: 50%;
                margin-right: 8px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.2);
              "></div>
              <span style="color: #555;">${user.name}</span>
            </div>
          `
        }).join('')}
        ${selectedUser ? `
          <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee;">
            <button onclick="window.clearUserSelection()" style="
              background: #6b7280;
              color: white;
              border: none;
              padding: 5px 10px;
              border-radius: 4px;
              font-size: 11px;
              cursor: pointer;
            ">👥 Show All Users</button>
          </div>
        ` : ''}
      `
      
      return div
    }
    
    legend.addTo(mapInstance)
  }

  // Map control functions
  const centerMap = () => {
    if (mapInstance) {
      if (selectedUser && selectedUser.location) {
        // Center on selected user
        mapInstance.setView([selectedUser.location.latitude, selectedUser.location.longitude], 12)
      } else {
        // Center on India with wider view
        mapInstance.setView([20.5937, 78.9629], 4)
      }
    }
  }

  const fitAllUsers = () => {
    if (mapInstance && activeUsers.length > 0) {
      const usersWithLocation = activeUsers.filter(user => user.location)
      if (usersWithLocation.length > 0) {
        const group = new window.L.featureGroup(
          usersWithLocation.map(user => 
            window.L.latLng(user.location.latitude, user.location.longitude)
          )
        )
        mapInstance.fitBounds(group.getBounds().pad(0.1))
      }
    }
  }

  const logout = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      if (token) {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear local storage and redirect
      localStorage.removeItem('adminToken')
      localStorage.removeItem('adminUser')
      navigate('/')
    }
  }

  const refreshData = () => {
    loadUsers()
  }

  const deleteUser = async (userName, event) => {
    event.stopPropagation() // Prevent user selection when clicking delete
    
    if (window.confirm(`Are you sure you want to permanently delete user "${userName}"? This action cannot be undone and will remove all their location data.`)) {
      try {
        const token = localStorage.getItem('adminToken')
        const response = await fetch(`/api/users/${encodeURIComponent(userName)}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          // Remove user from local state
          setActiveUsers(prevUsers => prevUsers.filter(user => user.name !== userName))
          
          // Remove marker from map if exists
          if (markers[userName] && mapInstance && mapInstance.hasLayer(markers[userName])) {
            mapInstance.removeLayer(markers[userName])
            setMarkers(prev => {
              const newMarkers = { ...prev }
              delete newMarkers[userName]
              return newMarkers
            })
          }
          
          // If this was the selected user, clear selection
          if (selectedUser && selectedUser.name === userName) {
            setSelectedUser(null)
          }
          
          // Clean up mini map state if it was expanded
          if (expandedUser === userName) {
            cleanupMiniMap(userName)
            setExpandedUser(null)
          }
          
          console.log(`User "${userName}" deleted successfully`)
        } else {
          throw new Error('Failed to delete user')
        }
      } catch (error) {
        console.error('Error deleting user:', error)
        alert(`Failed to delete user "${userName}". Please try again.`)
      }
    }
  }

  const clearAllUsers = async () => {
    if (window.confirm('Are you sure you want to deactivate all users? This cannot be undone.')) {
      try {
        const token = localStorage.getItem('adminToken')
        // Deactivate all users in Supabase
        const response = await fetch('/api/users/clear-all', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          setActiveUsers([])
          // Clear markers
          Object.values(markers).forEach(marker => {
            if (marker && mapInstance && mapInstance.hasLayer(marker)) {
              mapInstance.removeLayer(marker)
            }
          })
          setMarkers({})
          
          // Clean up all mini maps
          Object.keys(miniMapRefs.current).forEach(userName => {
            cleanupMiniMap(userName)
          })
          
          // Clear expanded user
          if (expandedUser) {
            setExpandedUser(null)
          }
        } else {
          throw new Error('Failed to clear users')
        }
      } catch (error) {
        console.error('Error clearing users:', error)
        alert('Failed to clear users. Please try again.')
      }
    }
  }

  // Show loading while checking authentication
  if (!isAuthenticated) {
    return (
      <>
        <style>{fontStyle}</style>
        <div className="bg-black min-h-screen flex items-center justify-center relative overflow-hidden" style={{ fontFamily: 'Quicksand, sans-serif' }}>
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/5 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
            <div className="absolute top-40 left-40 w-80 h-80 bg-white/8 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
          </div>
          
          <div className="relative z-10 bg-white rounded-3xl shadow-2xl p-8 text-center border border-gray-200">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-black border-t-transparent mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-black mb-2" style={{ fontFamily: 'DM Serif Text, serif' }}>Checking Authentication</h2>
            <p className="text-gray-600">Verifying admin credentials...</p>
          </div>
        </div>
      </>
    )
  }

  if (loading && activeUsers.length === 0) {
    return (
      <>
        <style>{fontStyle}</style>
        <div className="bg-black min-h-screen flex items-center justify-center relative overflow-hidden" style={{ fontFamily: 'Quicksand, sans-serif' }}>
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/5 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
            <div className="absolute top-40 left-40 w-80 h-80 bg-white/8 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
          </div>
          
          <div className="relative z-10 bg-white rounded-3xl shadow-2xl p-8 text-center border border-gray-200">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-black border-t-transparent mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-black mb-2" style={{ fontFamily: 'DM Serif Text, serif' }}>Loading Users</h2>
            <p className="text-gray-600">Fetching data from database...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{fontStyle}</style>
      <div className="bg-black min-h-screen p-4 relative overflow-hidden" style={{ fontFamily: 'Quicksand, sans-serif' }}>
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/5 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-white/8 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-4 sm:p-6 mb-6 border border-white/20 shadow-2xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 flex items-center gap-3">
                  <span className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-2xl flex items-center justify-center text-black text-lg sm:text-2xl">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                    </svg>
                  </span>
                  SPOT ME - Admin Dashboard
              </h1>
                <p className="text-gray-300 text-sm sm:text-base">
                Monitor all active users in real-time from Supabase database
              </p>
                
              {selectedUser && (
                  <div className="mt-3 p-2 sm:p-3 bg-white/20 border border-white/30 rounded-2xl text-white text-sm backdrop-blur-sm">
                    <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                    Individual Tracking: <span className="font-semibold">{selectedUser.name}</span>
                </div>
              )}
              {error && (
                  <div className="mt-3 p-2 sm:p-3 bg-red-500/20 border border-red-400/30 rounded-2xl text-red-300 text-sm backdrop-blur-sm">
                    <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {error}
                </div>
              )}
            </div>
              <div className="flex flex-wrap gap-2 sm:gap-3 justify-center lg:justify-end">
              <button
                onClick={refreshData}
                disabled={loading}
                  className="bg-white hover:bg-gray-100 text-black px-4 sm:px-6 py-2 sm:py-3 rounded-2xl font-semibold text-sm sm:text-base transition-all duration-200 hover:-translate-y-1 active:translate-y-0 transform disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 animate-spin inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                      Loading...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                      Refresh
                    </>
                  )}
              </button>
              <button
                onClick={clearAllUsers}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-2xl font-semibold text-sm sm:text-base transition-all duration-200 hover:-translate-y-1 active:translate-y-0 transform"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Clear All
                </button>
                
                {/* Bulk Tracking Control Buttons */}
                {activeUsers.length > 0 && (
                  <>
                    <button
                      onClick={startAllUserTracking}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-2xl font-semibold text-sm sm:text-base transition-all duration-200 hover:-translate-y-1 active:translate-y-0 transform"
                      title="Start tracking for all users"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                      Start All Tracking
                    </button>
                    <button
                      onClick={stopAllUserTracking}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-2xl font-semibold text-sm sm:text-base transition-all duration-200 hover:-translate-y-1 active:translate-y-0 transform"
                      title="Stop tracking for all users"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      Stop All Tracking
                    </button>
                  </>
                )}
                
                <button
                  onClick={logout}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-2xl font-semibold text-sm sm:text-base transition-all duration-200 hover:-translate-y-1 active:translate-y-0 transform"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:w-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                  </svg>
                  Logout
              </button>
              <a
                href="/"
                  className="bg-white hover:bg-gray-100 text-black px-4 sm:px-6 py-2 sm:py-3 rounded-2xl font-semibold text-sm sm:text-base transition-all duration-200 hover:-translate-y-1 active:translate-y-0 transform inline-block"
              >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  User View
              </a>
            </div>
          </div>
        </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
            {/* Map Panel - Hidden on mobile, shown on desktop */}
            <div className="xl:col-span-2 order-2 xl:order-1 hidden xl:block">
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-4 sm:p-6 border border-white/20 shadow-2xl">
                <h2 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-3">
                  <span className="w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-xl flex items-center justify-center text-black">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                    </svg>
                  </span>
                  Live User Locations
                </h2>
                
                <div className="bg-gray-900/50 rounded-2xl p-3 sm:p-4 border border-white/20 mb-3 sm:mb-4">
              <div 
                ref={mapRef}
                    className="w-full h-[350px] sm:h-[400px] lg:h-[450px] rounded-xl border-2 border-white/20 bg-gray-900 relative overflow-hidden"
              >
                {!isMapLoaded && (
                      <div className="flex items-center justify-center h-full text-gray-300">
                        <div className="text-center">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                          <p className="font-medium text-sm sm:text-base">Loading map...</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Map Controls */}
                  <div className="flex justify-center gap-2 sm:gap-3 mt-3 sm:mt-4">
                    <button 
                      onClick={centerMap}
                      className="bg-white text-black border-none rounded-lg px-3 sm:px-4 py-2 sm:py-3 cursor-pointer text-base sm:text-lg transition-all duration-200 hover:bg-gray-100 hover:-translate-y-1 hover:shadow-lg active:translate-y-0 touch-manipulation min-w-[44px] min-h-[44px] font-semibold" 
                      title="Center on Selected User"
                    >
                      🎯
                    </button>
                    <button 
                      onClick={fitAllUsers}
                      className="bg-white text-black border-none rounded-lg px-3 sm:px-4 py-2 sm:py-3 cursor-pointer text-base sm:text-lg transition-all duration-200 hover:bg-gray-100 hover:-translate-y-1 hover:shadow-lg active:translate-y-0 touch-manipulation min-w-[44px] min-h-[44px] font-semibold" 
                      title="Fit All Users"
                    >
                      👥
                    </button>
                  </div>
                </div>
            </div>
          </div>

            {/* User List Panel - Full width on mobile, sidebar on desktop */}
            <div className="xl:col-span-1 order-1 xl:order-2">
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-4 sm:p-6 border border-white/20 shadow-2xl">
                <h2 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-3">
                  <span className="w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-xl flex items-center justify-center text-black">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </span>
                  Active Users
                </h2>
                
                {/* Tracking Status Summary */}
                {activeUsers.length > 0 && (
                  <div className="mb-4 p-3 bg-white/10 border border-white/20 rounded-2xl">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <span className="text-white">
                          <span className="font-semibold">{activeUsers.length}</span> total users
                        </span>
                        <span className="text-green-300">
                          <span className="font-semibold">
                            {Object.values(userTrackingStates).filter(Boolean).length}
                          </span> being tracked
                        </span>
                        <span className="text-gray-300">
                          <span className="font-semibold">
                            {activeUsers.length - Object.values(userTrackingStates).filter(Boolean).length}
                          </span> not tracked
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        Admin controlled tracking
                      </div>
                    </div>
                  </div>
                )}
              
              {activeUsers.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 text-gray-300">
                    <div className="text-3xl sm:text-4xl mb-3">
                      <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="font-medium text-sm sm:text-base">No active users</p>
                    <p className="text-xs sm:text-sm text-gray-400">Users will appear here when they start tracking</p>
                </div>
              ) : (
                  <div className="space-y-2 sm:space-y-3 max-h-[400px] sm:max-h-[500px] overflow-y-auto">
                  {activeUsers.map((user, index) => (
                    <div 
                        key={`user-${user.name}-${user.id || index}`}
                        className={`bg-white/5 backdrop-blur-sm rounded-2xl border-2 cursor-pointer transition-all hover:bg-white/10 ${
                        selectedUser && selectedUser.name === user.name 
                            ? 'border-white bg-white/20' 
                            : 'border-white/20'
                      }`}
                      >
                        {/* User Card Header - Clickable for selection */}
                        <div 
                          className="p-3 sm:p-4"
                      onClick={() => handleUserSelect(user)}
                    >
                          <div className="flex items-center justify-between mb-2 sm:mb-3">
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                           <div 
                                className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                             style={{ backgroundColor: getUserColor(user.name) }}
                           ></div>
                              <h3 className="font-semibold text-white text-sm sm:text-base truncate">{user.name}</h3>
                           {selectedUser && selectedUser.name === user.name && (
                                <span className="text-xs bg-white/20 text-white px-2 py-1 rounded-full border border-white/30 flex-shrink-0">
                                  <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                  </svg>
                                  Tracking
                             </span>
                           )}
                         </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs bg-white/20 text-white px-2 py-1 rounded-full border border-white/30">
                           Active
                         </span>
                              
                              {/* Admin Tracking Controls */}
                              <div className="flex items-center gap-1">
                                {/* Start/Stop Tracking Button */}
                                {userTrackingStates[user.name] ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      stopUserTracking(user.name)
                                    }}
                                    disabled={trackingControlLoading[user.name]}
                                    className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/20 p-1 sm:p-2 rounded-xl transition-all duration-200 disabled:opacity-50"
                                    title={`Stop tracking for ${user.name}`}
                                  >
                                    {trackingControlLoading[user.name] ? (
                                      <svg className="w-4 h-4 animate-spin" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                      </svg>
                                    ) : (
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </button>
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      startUserTracking(user.name)
                                    }}
                                    disabled={trackingControlLoading[user.name]}
                                    className="text-green-400 hover:text-green-300 hover:bg-green-500/20 p-1 sm:p-2 rounded-xl transition-all duration-200 disabled:opacity-50"
                                    title={`Start tracking for ${user.name}`}
                                  >
                                    {trackingControlLoading[user.name] ? (
                                      <svg className="w-4 h-4 animate-spin" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                      </svg>
                                    ) : (
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </button>
                                )}
                                
                                {/* Tracking Status Indicator */}
                                {userTrackingStates[user.name] && (
                                  <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full border border-green-400/30">
                                    🟢 Admin Tracking
                                  </span>
                                )}
                              </div>
                              
                              <button
                                onClick={(e) => deleteUser(user.name, e)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/20 p-1 sm:p-2 rounded-xl transition-all duration-200"
                                title={`Delete ${user.name} permanently`}
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                       </div>
                      
                      {user.location ? (
                            <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-300">
                          <div className="flex justify-between">
                            <span>Lat:</span>
                                <span className="font-mono text-white text-xs truncate max-w-[80px] sm:max-w-[120px]">{user.location.latitude?.toFixed(6) || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Lng:</span>
                                <span className="font-mono text-white text-xs truncate max-w-[80px] sm:max-w-[120px]">{user.location.longitude?.toFixed(6) || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Accuracy:</span>
                                <span className="text-white text-xs">{user.location.accuracy ? `${user.location.accuracy.toFixed(2)}m` : 'N/A'}</span>
                          </div>
                              <div className="text-xs text-gray-400 mt-2 sm:mt-3 pt-2 border-t border-white/10">
                            Last: {user.lastUpdated ? new Date(user.lastUpdated).toLocaleTimeString() : 'Unknown'}
                          </div>
                        </div>
                      ) : (
                            <div className="text-xs sm:text-sm text-gray-400">
                          No location data yet
                        </div>
                      )}
                        </div>

                        {/* Expandable Section - Mobile Only */}
                        <div className="xl:hidden">
                          {/* Expand/Collapse Button */}
                          <div 
                            className="px-3 sm:px-4 pb-3 sm:pb-4 cursor-pointer"
                            onClick={() => toggleUserExpansion(user.name)}
                          >
                            <div className="flex items-center justify-center gap-2 text-gray-300 hover:text-white transition-colors duration-200">
                              <span className="text-xs font-medium">
                                {expandedUser === user.name ? 'Hide Map' : 'Show Map'}
                              </span>
                              <svg 
                                className={`w-4 h-4 transition-transform duration-200 ${expandedUser === user.name ? 'rotate-180' : ''}`} 
                                fill="currentColor" 
                                viewBox="0 0 20 20"
                              >
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>

                          {/* Expandable Map Section */}
                          {expandedUser === user.name && user.location && (
                            <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                              <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                                <h4 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                  </svg>
                                  {user.name}'s Location
                                </h4>
                                
                                {/* Mini Map Container */}
                                <div className="bg-gray-900 rounded-xl border border-white/20 h-[200px] relative overflow-hidden">
                                  {miniMapStates[user.name]?.loading ? (
                                    <div className="flex items-center justify-center h-full text-gray-400">
                                      <div className="text-center">
                                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                        <p className="text-xs">Loading map...</p>
                                      </div>
                                    </div>
                                  ) : miniMapStates[user.name]?.error ? (
                                    <div className="flex items-center justify-center h-full text-red-400">
                                      <div className="text-center">
                                        <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        <p className="text-xs">Map error</p>
                                        <p className="text-xs text-gray-500 mt-1">{miniMapStates[user.name]?.errorMessage || 'Failed to load'}</p>
                                      </div>
                                    </div>
                                  ) : (
                                    <div 
                                      id={`mini-map-${user.name}`}
                                      className="w-full h-full"
                                    >
                                      {!miniMapRefs.current[user.name] && (
                                        <div className="flex items-center justify-center h-full text-gray-400">
                                          <div className="text-center">
                                            <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                            </svg>
                                            <p className="text-xs">Map ready</p>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Location Info */}
                                <div className="mt-3 text-xs text-gray-300">
                                  <p className="truncate">{user.location.locationName || 'Coordinates only'}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                    </div>
                  ))}
                </div>
              )}
              
                <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-400 border-t border-white/10 pt-3 sm:pt-4">
                <p>Auto-refreshes every 15 seconds</p>
                  <p className="text-white font-medium">Total users: {activeUsers.length}</p>
                <p className="mt-1 text-xs">Data from Supabase database</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default AdminDashboard
