import { useState, useEffect, useRef } from 'react'

export const useLocationTracking = () => {
  const [location, setLocation] = useState(null)
  const [isTracking, setIsTracking] = useState(false)
  const [status, setStatus] = useState(null)
  const [locationName, setLocationName] = useState('')
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingLocations, setPendingLocations] = useState([])
  const intervalRef = useRef(null)
  const syncTimeoutRef = useRef(null)

  const getLocationName = async (lat, lng) => {
    try {
      setLocationName('Loading...')
      
      const url = `/api/geocode?lat=${lat}&lng=${lng}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.display_name) {
        // Use the full location name for both display and map popup
        const fullLocationName = data.display_name
        
        // Display the full location name
        setLocationName(fullLocationName)
        
        // Return the full version for the server data
        return fullLocationName
      } else {
        setLocationName('Location name unavailable')
        return 'Location name unavailable'
      }
      
    } catch (error) {
      console.error('Error getting location name:', error)
      setLocationName('Location name unavailable')
      return 'Location name unavailable'
    }
  }

  const updateLocation = async () => {
    if (!navigator.geolocation) {
      setStatus({ type: 'error', message: 'Geolocation is not supported by this browser.' })
      return
    }

    try {
      setStatus({ type: 'info', message: 'Getting your location...' })
      
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        })
      })

      const { latitude, longitude, accuracy } = position.coords
      // Use ISO format for Supabase compatibility
      const timestamp = new Date().toISOString()
      
      // Get location name
      const locationNameResult = await getLocationName(latitude, longitude)
      
      const newLocation = {
        latitude,
        longitude,
        accuracy,
        timestamp,
        method: 'live-tracking-3s'
      }
      
      setLocation(newLocation)
      setStatus({ type: 'success', message: 'Location updated successfully!' })
      
      // Try to send to server immediately if online
      if (isOnline) {
        try {
          await fetch('/api/location', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...newLocation,
              locationName: locationNameResult
            })
          })
          console.log('Location sent to server successfully')
        } catch (error) {
          console.error('Error sending location to server:', error)
          // If sending fails, cache it for later
          cacheLocationForOffline(newLocation, locationNameResult)
        }
      } else {
        // If offline, cache the location
        cacheLocationForOffline(newLocation, locationNameResult)
        setStatus({ type: 'warning', message: 'Location cached offline. Will sync when connection is restored.' })
      }
      
    } catch (error) {
      handleLocationError(error)
    }
  }

  const cacheLocationForOffline = (locationData, locationName) => {
    const locationWithName = {
      ...locationData,
      locationName,
      cachedAt: new Date().toISOString()
    }
    
    setPendingLocations(prev => [...prev, locationWithName])
    
    // Store in localStorage for persistence across page reloads
    const stored = JSON.parse(localStorage.getItem('pendingLocations') || '[]')
    stored.push(locationWithName)
    localStorage.setItem('pendingLocations', JSON.stringify(stored))
    
    console.log('Location cached offline:', locationWithName)
  }

  const syncPendingLocations = async () => {
    if (pendingLocations.length === 0) return
    
    setStatus({ type: 'info', message: `Syncing ${pendingLocations.length} cached locations...` })
    
    const locationsToSync = [...pendingLocations]
    let successCount = 0
    let errorCount = 0
    
    for (const locationData of locationsToSync) {
      try {
        const response = await fetch('/api/location', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(locationData)
        })
        
        if (response.ok) {
          successCount++
        } else {
          errorCount++
        }
      } catch (error) {
        console.error('Error syncing cached location:', error)
        errorCount++
      }
    }
    
    if (successCount > 0) {
      setStatus({ type: 'success', message: `Synced ${successCount} locations successfully!` })
      
      // Remove successfully synced locations
      setPendingLocations(prev => prev.slice(successCount))
      
      // Update localStorage
      const stored = JSON.parse(localStorage.getItem('pendingLocations') || '[]')
      const updatedStored = stored.slice(successCount)
      localStorage.setItem('pendingLocations', JSON.stringify(updatedStored))
    }
    
    if (errorCount > 0) {
      setStatus({ type: 'warning', message: `${errorCount} locations failed to sync and will be retried later.` })
    }
  }

  const handleLocationError = (error) => {
    let message = 'Unknown error occurred while getting location.'
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'Location access denied. Please allow location access and try again.'
        break
      case error.POSITION_UNAVAILABLE:
        message = 'Location information is unavailable. Please try again.'
        break
      case error.TIMEOUT:
        message = 'Location request timed out. Please try again.'
        break
      default:
        message = error.message || message
    }
    
    setStatus({ type: 'error', message })
    console.error('Location error:', error)
  }

  const startTracking = () => {
    setIsTracking(true)
    setStatus({ type: 'info', message: 'Live tracking started! Updating every 3 seconds...' })
    
    // Get initial location
    updateLocation()
    
    // Set up interval for live tracking
    intervalRef.current = setInterval(updateLocation, 3000)
  }

  const stopTracking = () => {
    setIsTracking(false)
    setStatus({ type: 'info', message: 'Live tracking stopped.' })
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  // Online/offline detection and auto-sync
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setStatus({ type: 'success', message: 'Connection restored! Syncing cached locations...' })
      
      // Clear any existing sync timeout
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
      
      // Sync pending locations after a short delay to ensure connection is stable
      syncTimeoutRef.current = setTimeout(() => {
        syncPendingLocations()
      }, 2000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setStatus({ type: 'warning', message: 'Connection lost. Locations will be cached offline.' })
    }

    // Load pending locations from localStorage on mount
    const stored = JSON.parse(localStorage.getItem('pendingLocations') || '[]')
    if (stored.length > 0) {
      setPendingLocations(stored)
      setStatus({ type: 'info', message: `${stored.length} cached locations found. Will sync when connection is restored.` })
    }

    // Add event listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [pendingLocations.length]) // Re-run when pending locations change

  return {
    location,
    isTracking,
    startTracking,
    stopTracking,
    status,
    locationName,
    isOnline,
    pendingLocations,
    syncPendingLocations
  }
}
