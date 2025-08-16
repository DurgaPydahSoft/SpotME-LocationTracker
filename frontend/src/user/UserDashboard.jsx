import React, { useState, useEffect, useRef } from 'react'
import { useLocationTracking } from '../hooks/useLocationTracking'
import AdminLoginPopup from '../components/AdminLoginPopup'

// Font imports
const fontStyle = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Text:ital@0;1&family=Quicksand:wght@300..700&display=swap');
`

const UserDashboard = () => {
  const [userName, setUserName] = useState('')
  const [isNameSubmitted, setIsNameSubmitted] = useState(false)
  const [nameError, setNameError] = useState('')
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  
  const {
    location,
    isTracking,
    startTracking,
    stopTracking,
    status,
    locationName,
    isOnline,
    pendingLocations,
    syncPendingLocations
  } = useLocationTracking()

  // Map refs and state
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)
  const backgroundTrackingRef = useRef(null)

  // Check if user already has a name in localStorage
  useEffect(() => {
    const savedName = localStorage.getItem('userName')
    if (savedName) {
      setUserName(savedName)
      setIsNameSubmitted(true)
      
      // Check if background tracking was active (silently)
      const backgroundTracking = localStorage.getItem('backgroundTracking')
      const trackingUser = localStorage.getItem('trackingUser')
      
      if (backgroundTracking === 'true' && trackingUser === savedName) {
        // Background tracking was active, restore silently
        // No visual indicators shown to user
      }
    }
  }, [])

  // Page Visibility API - Detect when page becomes hidden/visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden
      
      if (isVisible) {
        // Page became visible again
        // No visual indicators shown to user
      } else {
        // Page became hidden (user navigated away or pressed back)
        if (isTracking) {
          // No visual indicators shown to user
          // Ensure tracking continues
          ensureBackgroundTracking()
        }
      }
    }

    // Handle page visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Handle page unload (user closing tab/window)
    const handleBeforeUnload = (e) => {
      if (isTracking) {
        // Show message that tracking will continue
        e.preventDefault()
        e.returnValue = 'Location tracking is active. Tracking will continue in the background.'
        return 'Location tracking is active. Tracking will continue in the background.'
      }
    }

    // Handle page unload
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    // Handle mobile back button and navigation
    const handlePopState = () => {
      if (isTracking) {
        // No visual indicators shown to user
        ensureBackgroundTracking()
      }
    }
    
    window.addEventListener('popstate', handlePopState)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [isTracking])

  // Ensure background tracking continues
  const ensureBackgroundTracking = () => {
    if (!isTracking) return
    
    // Store tracking state in localStorage to persist across page changes
    localStorage.setItem('backgroundTracking', 'true')
    localStorage.setItem('trackingUser', userName)
    localStorage.setItem('trackingStartTime', new Date().toISOString())
    
    // Set up interval to continue tracking even when page is hidden
    if (backgroundTrackingRef.current) {
      clearInterval(backgroundTrackingRef.current)
    }
    
    backgroundTrackingRef.current = setInterval(() => {
      // Check if we should still be tracking
      const shouldTrack = localStorage.getItem('backgroundTracking') === 'true'
      if (!shouldTrack) {
        clearInterval(backgroundTrackingRef.current)
        return
      }
      
      // Continue location tracking in background
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp
            }
            
            // Store location for when page becomes visible again
            localStorage.setItem('backgroundLocation', JSON.stringify(newLocation))
            localStorage.setItem('lastBackgroundUpdate', new Date().toISOString())
            
            // Send to backend if possible
            if (navigator.onLine) {
              const userData = {
                name: userName,
                location: {
                  ...newLocation,
                  locationName: localStorage.getItem('lastLocationName') || 'Background tracking'
                },
                lastUpdated: new Date().toISOString()
              }
              
              fetch('/api/users/update-location', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
              }).catch(err => console.log('Background sync failed:', err))
            }
          },
          (error) => {
            console.log('Background location error:', error)
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000
          }
        )
      }
    }, 30000) // Update every 30 seconds in background
  }

  // Clean up background tracking when component unmounts
  useEffect(() => {
    return () => {
      if (backgroundTrackingRef.current) {
        clearInterval(backgroundTrackingRef.current)
      }
    }
  }, [])

  // Check for background tracking when page becomes visible
  useEffect(() => {
    if (isTracking) {
      // Check if we have background location data
      const backgroundLocation = localStorage.getItem('backgroundLocation')
      const lastBackgroundUpdate = localStorage.getItem('lastBackgroundUpdate')
      
      if (backgroundLocation && lastBackgroundUpdate) {
        const locationData = JSON.parse(backgroundLocation)
        const updateTime = new Date(lastBackgroundUpdate)
        const now = new Date()
        
        // If background update was recent (within last 2 minutes), use it
        if (now - updateTime < 120000) {
          // No visual indicators shown to user
        }
      }
    }
  }, [isTracking])

  // Initialize map when component mounts
  useEffect(() => {
    if (!isNameSubmitted) return // Don't initialize map until name is submitted
    
    // Load Leaflet CSS dynamically
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    // Load Leaflet JS dynamically
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => {
      if (window.L && mapRef.current && !mapInstanceRef.current) {
        initMap()
      }
    }
    document.head.appendChild(script)

    return () => {
      // Cleanup
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [isNameSubmitted])

  // Initialize map function
  const initMap = () => {
    if (!window.L || mapInstanceRef.current) return

    try {
      // Start with the center of India
      const centerLat = 20.5937
      const centerLng = 78.9629
      
      // Create map centered on India
      mapInstanceRef.current = window.L.map(mapRef.current).setView([centerLat, centerLng], 5)
      
      // Add OpenStreetMap tiles
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(mapInstanceRef.current)
      
      console.log('Map initialized successfully with India center')
    } catch (error) {
      console.error('Error initializing map:', error)
    }
  }

  // Update map when location changes
  useEffect(() => {
    if (location && mapInstanceRef.current && window.L) {
      updateMap()
    }
  }, [location])

  // Update map popup when locationName changes
  useEffect(() => {
    if (location && mapInstanceRef.current && window.L && markerRef.current && locationName) {
      // Update the existing marker without popup
      const { latitude, longitude } = location
      // No popup content - just update the marker position
      console.log('Map updated with new location:', { latitude, longitude, locationName })
    }
  }, [locationName, location, userName])

  // Update map function
  const updateMap = () => {
    if (!mapInstanceRef.current || !window.L || !location) return

    try {
      const { latitude, longitude } = location
      
      // Remove existing marker
      if (markerRef.current) {
        mapInstanceRef.current.removeLayer(markerRef.current)
      }
      
      // Clear all existing markers
      mapInstanceRef.current.eachLayer((layer) => {
        if (layer instanceof window.L.Marker) {
          mapInstanceRef.current.removeLayer(layer)
        }
      })
      
      // Add new marker for user's location without popup
      markerRef.current = window.L.marker([latitude, longitude]).addTo(mapInstanceRef.current)
      
      // Center map on location without popup
      mapInstanceRef.current.setView([latitude, longitude], 15)
      
      console.log('Map updated with new location:', { latitude, longitude, locationName: locationName || 'Coordinates only' })
    } catch (error) {
      console.error('Error updating map:', error)
    }
  }

  // Map control functions
  const zoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn()
    }
  }

  const zoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut()
    }
  }

  const centerMap = () => {
    if (location && mapInstanceRef.current) {
      mapInstanceRef.current.setView([location.latitude, location.longitude], 15)
      if (markerRef.current) {
        markerRef.current.openPopup()
      }
    }
  }

  // Copy to clipboard functionality
  const copyToClipboard = async (text, type) => {
    if (text === '-') return
    
    try {
      await navigator.clipboard.writeText(text)
      console.log(`${type} copied to clipboard!`)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Handle name submission
  const handleNameSubmit = (e) => {
    e.preventDefault()
    const trimmedName = userName.trim()
    
    if (!trimmedName) {
      setNameError('Please enter your name')
      return
    }
    
    // Check if name already exists in localStorage
    const existingUsers = JSON.parse(localStorage.getItem('activeUsers') || '[]')
    if (existingUsers.some(user => user.name === trimmedName)) {
      setNameError('This name already exists. Please choose a different name.')
      return
    }
    
    // Save name and mark as submitted
    localStorage.setItem('userName', trimmedName)
    setIsNameSubmitted(true)
    setNameError('')
    
    // Add user to active users list
    const newUser = {
      name: trimmedName,
      id: Date.now().toString(),
      isActive: true,
      lastUpdated: new Date().toISOString()
    }
    existingUsers.push(newUser)
    localStorage.setItem('activeUsers', JSON.stringify(existingUsers))
    
    // Send user data to backend
    fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newUser)
    }).catch(err => console.error('Error sending user data:', err))
  }

  // Enhanced stop tracking function that also stops background tracking
  const handleStopTracking = () => {
    // Stop the main tracking
    stopTracking()
    
    // Stop background tracking
    if (backgroundTrackingRef.current) {
      clearInterval(backgroundTrackingRef.current)
      backgroundTrackingRef.current = null
    }
    
    // Clear background tracking flags
    localStorage.removeItem('backgroundTracking')
    localStorage.removeItem('trackingUser')
    localStorage.removeItem('trackingStartTime')
    localStorage.removeItem('backgroundLocation')
    localStorage.removeItem('lastBackgroundUpdate')
  }

  // Enhanced start tracking function
  const handleStartTracking = () => {
    startTracking()
  }

  // Send location updates to backend when tracking
  useEffect(() => {
    if (isTracking && location && userName) {
      const userData = {
        name: userName,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          timestamp: location.timestamp,
          locationName: locationName
        },
        lastUpdated: new Date().toISOString()
      }
      
      // Store location name for background tracking
      if (locationName) {
        localStorage.setItem('lastLocationName', locationName)
      }
      
      // Update localStorage
      const existingUsers = JSON.parse(localStorage.getItem('activeUsers') || '[]')
      const userIndex = existingUsers.findIndex(user => user.name === userName)
      if (userIndex !== -1) {
        existingUsers[userIndex] = { ...existingUsers[userIndex], ...userData }
        localStorage.setItem('activeUsers', JSON.stringify(existingUsers))
      }
      
      // Send to backend
      fetch('/api/users/update-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      }).catch(err => console.error('Error updating location:', err))
    }
  }, [isTracking, location, userName, locationName])

  // If name not submitted, show name input form
  if (!isNameSubmitted) {
    return (
      <>
        <style>{fontStyle}</style>
        <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden" style={{ fontFamily: 'Quicksand, sans-serif' }}>
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/5 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
            <div className="absolute top-40 left-40 w-80 h-80 bg-white/8 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
          </div>
          
          <div className="relative z-10 bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full border border-gray-200">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-black rounded-2xl mb-6 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 sm:mb-6 lg:mb-8" style={{ fontFamily: 'DM Serif Text, serif' }}>
                SPOT ME
              </h1>
              <p className="text-lg sm:text-xl text-gray-300 mb-6 sm:mb-8 lg:mb-10">
                Advanced Location Tracking System
              </p>
            </div>
          
          <form onSubmit={handleNameSubmit} className="space-y-6">
            <div>
                <label htmlFor="userName" className="block text-sm font-semibold text-gray-800 mb-3">
                Enter Your Name
              </label>
              <input
                type="text"
                id="userName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300 text-black placeholder-gray-500"
                placeholder="Your name here..."
                autoFocus
              />
              {nameError && (
                  <p className="mt-3 text-sm text-red-500 flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    {nameError}
                  </p>
              )}
            </div>
            
            <button
              type="submit"
                className="w-full bg-black text-white py-4 px-8 rounded-2xl font-bold text-lg transition-all duration-300 hover:bg-gray-800 hover:-translate-y-1 active:translate-y-0 transform"
            >
                <svg className="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Start Tracking
            </button>
          </form>
          
            <div className="mt-8 text-center">
              <button 
                onClick={() => setShowAdminLogin(true)}
                className="text-gray-600 hover:text-black text-sm transition-colors duration-200 flex items-center justify-center gap-2 mx-auto"
              >
                <span className="w-5 h-5 bg-black rounded-full flex items-center justify-center text-xs text-white">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                  </svg>
                </span>
                Admin Dashboard
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Main tracking interface
  return (
    <>
      <style>{fontStyle}</style>
      <div className="min-h-screen bg-black relative overflow-hidden" style={{ fontFamily: 'Quicksand, sans-serif' }}>
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/5 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-white/8 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative z-10 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            
            {/* Header Section */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl mb-4 shadow-lg">
                <svg className="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3">
                SPOT ME
              </h1>
              <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-3 border border-white/20">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                <span className="text-white font-semibold">
                  <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  {userName}
                </span>
                <span className="text-gray-300 text-sm">Active User</span>
              </div>
              

            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
              
              {/* Left Panel - Controls and Location Info */}
              <div className="space-y-4 sm:space-y-6">
                
                {/* Tracking Control Card */}
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-4 sm:p-6 border border-white/20 shadow-2xl">
                  <div className="text-center mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl font-bold text-white mb-2">Live Tracking Control</h2>
                    <p className="text-gray-300 text-xs sm:text-sm">Start or stop location tracking</p>
                  </div>
          
                  {/* Background Tracking Status */}
                  {/* No visual indicators shown to user */}
          
                  <button
                    onClick={isTracking ? handleStopTracking : handleStartTracking}
                    disabled={isTracking}
                    className={`w-full py-4 sm:py-5 px-6 sm:px-8 rounded-2xl font-bold text-base sm:text-lg transition-all duration-300 transform ${
                      isTracking 
                        ? 'bg-red-600 text-white shadow-2xl shadow-red-500/25' 
                        : 'bg-white text-black hover:bg-gray-100 hover:-translate-y-1'
                    } active:translate-y-0 disabled:cursor-not-allowed`}
                  >
                    {isTracking ? (
                      <div className="flex items-center justify-center gap-2 sm:gap-3">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm sm:text-base">Live Tracking Active...</span>
                      </div>
                    ) : (
                      <>
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                        Start Live Tracking
                      </>
                    )}
                  </button>
                  

                </div>

                {/* Status Cards */}
          {status && (
                  <div className={`p-3 sm:p-4 rounded-2xl border backdrop-blur-sm ${
                    status.type === 'success' ? 'bg-green-500/20 border-green-400/30' :
                    status.type === 'error' ? 'bg-red-500/20 border-red-400/30' :
                    status.type === 'warning' ? 'bg-yellow-500/20 border-yellow-400/30' :
                    'bg-white/20 border-white/30'
                  }`}>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
                        status.type === 'success' ? 'bg-green-400' :
                        status.type === 'error' ? 'bg-red-400' :
                        status.type === 'warning' ? 'bg-yellow-400' :
                        'bg-white'
                      }`}></div>
                      <p className="text-white font-medium text-sm sm:text-base">{status.message}</p>
                    </div>
            </div>
          )}

                {/* Connection Status Card */}
                <div className={`p-3 sm:p-4 rounded-2xl border backdrop-blur-sm ${
                  isOnline ? 'bg-green-500/20 border-green-400/30' : 'bg-red-500/20 border-red-400/30'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`}></div>
                      <span className="text-white font-semibold text-sm sm:text-base">
                        {isOnline ? (
                          <>
                            <svg className="w-3 h-3 sm:w-4 sm:h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Online
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3 sm:w-4 sm:h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414L6.586 10l-4.293 4.293a1 1 0 101.414 1.414L10 11.414l4.293 4.293a1 1 0 001.414-1.414L11.414 10l4.293-4.293a1 1 0 00-1.414-1.414L10 8.586 5.707 4.293z" clipRule="evenodd" />
                            </svg>
                            Offline
                          </>
                        )}
                      </span>
                    </div>
                    {!isOnline && (
                      <span className="text-gray-300 text-xs sm:text-sm bg-white/10 px-2 sm:px-3 py-1 rounded-full">
                        Cached Mode
                      </span>
                    )}
                  </div>
                </div>

                {/* Pending Locations Card */}
                {pendingLocations.length > 0 && (
                  <div className="bg-white/20 border border-white/30 rounded-2xl p-3 sm:p-4 backdrop-blur-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                      <h4 className="text-white font-semibold text-sm sm:text-base flex items-center gap-2">
                        <span className="w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-full flex items-center justify-center text-xs sm:text-sm text-black">
                          <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                          </svg>
                        </span>
                        Cached Locations ({pendingLocations.length})
                      </h4>
                      {isOnline && (
                    <button 
                          onClick={syncPendingLocations}
                          className="bg-white hover:bg-gray-100 text-black px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors duration-200 flex items-center gap-2 self-start sm:self-auto"
                    >
                          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                          </svg>
                          Sync Now
                    </button>
                      )}
                    </div>
                    <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
                      {isOnline 
                        ? 'These locations will be synced automatically, or click "Sync Now" to sync immediately.'
                        : 'These locations are stored locally and will be synced when you come back online.'
                      }
                    </p>
                  </div>
                )}

                {/* Location Info Card */}
                {location && (
                  <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-4 sm:p-6 border border-white/20 shadow-2xl">
                    <h3 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-3">
                      <span className="w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-xl flex items-center justify-center text-black">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                      </span>
                      Your Location Details
                    </h3>
                    
                    <div className="space-y-3 sm:space-y-4">
                      {[
                        { label: 'Latitude', value: location.latitude?.toFixed(6) || '-', icon: '🌐' },
                        { label: 'Longitude', value: location.longitude?.toFixed(6) || '-', icon: '🌍' },
                        { label: 'Accuracy', value: location.accuracy ? `${location.accuracy.toFixed(2)}m` : '-', icon: '🎯' },
                        { label: 'Location Name', value: locationName || '-', icon: '🏠' },
                        { label: 'Timestamp', value: location.timestamp ? new Date(location.timestamp).toLocaleString() : '-', icon: '⏰' }
                      ].map((item, index) => (
                        <div key={index} className="bg-white/5 rounded-2xl p-3 sm:p-4 border border-white/10">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <span className="text-base sm:text-lg">{item.icon}</span>
                              <span className="text-gray-300 font-medium text-sm sm:text-base">{item.label}</span>
                </div>
                            <div className="flex items-center gap-2 sm:gap-3">
                              <span className="text-white font-mono text-xs sm:text-sm break-all max-w-full sm:max-w-[120px] lg:max-w-[200px]">
                                {item.value}
                              </span>
                              {item.value !== '-' && (
                    <button 
                                  onClick={() => copyToClipboard(item.value, item.label)}
                                  className="bg-white hover:bg-gray-100 text-black p-1.5 sm:p-2 rounded-xl transition-colors duration-200 flex-shrink-0"
                                  title={`Copy ${item.label}`}
                                >
                                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                                  </svg>
                    </button>
                              )}
                  </div>
                </div>
                </div>
                      ))}
              </div>
            </div>
          )}
          
                {/* Admin Access Button */}
                <div className="text-center">
                  <button 
                    onClick={() => setShowAdminLogin(true)}
                    className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center justify-center gap-2 mx-auto group"
                  >
                    <span className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-xs text-black group-hover:scale-110 transition-transform duration-200">
                      <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                      </svg>
                    </span>
                    <span className="text-sm">Admin Dashboard</span>
                  </button>
          </div>
        </div>

        {/* Right Panel - Map */}
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-4 sm:p-6 border border-white/20 shadow-2xl">
                <h3 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-3">
                  <span className="w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-xl flex items-center justify-center text-black">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                    </svg>
                  </span>
                  Interactive Map
                </h3>
                
            <div 
              ref={mapRef}
                  className="bg-gray-900 border-2 border-white/20 rounded-2xl shadow-lg mb-4 h-[300px] sm:h-[400px] lg:h-[500px] xl:h-[600px] relative overflow-hidden"
            >
              {!mapInstanceRef.current && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-300 font-medium text-sm sm:text-base">Loading map...</p>
                      </div>
                </div>
              )}
            </div>
                
                {/* Map Controls */}
            <div className="flex justify-center gap-2 sm:gap-3">
                  {[
                    { onClick: zoomIn, icon: '➕', label: 'Zoom In' },
                    { onClick: zoomOut, icon: '➖', label: 'Zoom Out' },
                    { onClick: centerMap, icon: '🎯', label: 'Center' }
                  ].map((control, index) => (
              <button 
                      key={index}
                      onClick={control.onClick}
                      className="bg-white hover:bg-gray-100 text-black p-2 sm:p-3 rounded-2xl transition-all duration-200 hover:shadow-lg hover:-translate-y-1 active:translate-y-0 transform"
                      title={control.label}
                    >
                      <span className="text-base sm:text-lg">{control.icon}</span>
              </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Admin Access Button */}
        <div className="text-center mt-6 sm:mt-8">
          <button 
            onClick={() => setShowAdminLogin(true)}
            className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center justify-center gap-2 mx-auto group"
          >
            <span className="w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-full flex items-center justify-center text-xs sm:text-sm text-black group-hover:scale-110 transition-transform duration-200">
              <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
              </svg>
            </span>
            <span className="text-xs sm:text-sm">Admin Dashboard</span>
          </button>
        </div>
        
        {/* Admin Login Popup */}
        <AdminLoginPopup
          isOpen={showAdminLogin}
          onClose={() => setShowAdminLogin(false)}
          onLoginSuccess={(token) => {
            // Navigate to admin dashboard after successful login
            window.location.href = '/admin';
          }}
        />
      </div>
    </>
  )
}

export default UserDashboard
