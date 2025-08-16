import React, { useState, useEffect, useRef } from 'react'
import { useLocationTracking } from '../hooks/useLocationTracking'

const LocationTracker = () => {
  const {
    location,
    isTracking,
    startTracking,
    stopTracking,
    status,
    locationName
  } = useLocationTracking()

  // Map refs and state
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)

  // Initialize map when component mounts
  useEffect(() => {
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
  }, [])

  // Initialize map function
  const initMap = () => {
    if (!window.L || mapInstanceRef.current) return

    try {
      // Start with a random interesting location (Paris, France)
      const randomLat = 48.8566
      const randomLng = 2.3522
      
      // Create map centered on random location
      mapInstanceRef.current = window.L.map(mapRef.current).setView([randomLat, randomLng], 10)
      
      // Add OpenStreetMap tiles
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(mapInstanceRef.current)
      
      // Add a marker for the random location
      const randomMarker = window.L.marker([randomLat, randomLng]).addTo(mapInstanceRef.current)
      randomMarker.bindPopup('<div style="text-align: center;"><strong>🗺️ Random Location</strong><br><small>Paris, France</small><br><small>Click "Start Live Tracking" to show your location!</small></div>').openPopup()
      
      console.log('Map initialized successfully')
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
      // Update the existing popup content with new location name
      const { latitude, longitude } = location
      const popupContent = `
        <div style="text-align: center; max-width: 250px;">
          <strong>📍 Your Location</strong><br>
          <div style="margin: 8px 0; padding: 8px; background: #f8f9fa; border-radius: 6px; font-size: 12px; line-height: 1.4;">
            ${locationName}
          </div>
          <small>Lat: ${latitude.toFixed(6)}</small><br>
          <small>Lng: ${longitude.toFixed(6)}</small>
        </div>
      `
      markerRef.current.bindPopup(popupContent).openPopup()
      console.log('Map popup updated with location name:', locationName)
    }
  }, [locationName, location])

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
      
      // Add new marker for user's location
      markerRef.current = window.L.marker([latitude, longitude]).addTo(mapInstanceRef.current)
      
      // Add popup with location info - use current locationName or fallback
      const currentLocationName = locationName || 'Coordinates only'
      const popupContent = `
        <div style="text-align: center; max-width: 250px;">
          <strong>📍 Your Location</strong><br>
          <div style="margin: 8px 0; padding: 8px; background: #f8f9fa; border-radius: 6px; font-size: 12px; line-height: 1.4;">
            ${currentLocationName}
          </div>
          <small>Lat: ${latitude.toFixed(6)}</small><br>
          <small>Lng: ${longitude.toFixed(6)}</small>
        </div>
      `
      markerRef.current.bindPopup(popupContent).openPopup()
      
      // Center map on location
      mapInstanceRef.current.setView([latitude, longitude], 15)
      
      console.log('Map updated with new location:', { latitude, longitude, locationName: currentLocationName })
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
      // Show success feedback
      console.log(`${type} copied to clipboard!`)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="bg-gradient-to-br from-blue-500 to-purple-600 min-h-screen p-2 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto min-h-screen flex flex-col lg:grid lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-8 p-2 sm:p-0">
        
        {/* Left Panel - Controls and Location Info */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl p-4 sm:p-6 lg:p-8 flex flex-col justify-center text-center order-2 lg:order-1">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light text-gray-800 mb-4 sm:mb-6 lg:mb-8">
            📍 SPOT ME - Live Location Tracking
          </h1>
          
          <button
            onClick={isTracking ? stopTracking : startTracking}
            disabled={isTracking}
            className="bg-gradient-to-r from-red-500 to-orange-500 text-white border-none py-4 sm:py-5 px-6 sm:px-8 text-base sm:text-lg lg:text-xl rounded-full cursor-pointer transition-all duration-300 mb-4 sm:mb-6 lg:mb-8 font-semibold shadow-lg hover:shadow-xl hover:-translate-y-1 active:translate-y-0 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none touch-manipulation"
          >
            {isTracking ? (
              <>
                <span className="loading"></span>
                Live Tracking Active...
              </>
            ) : (
              '🎯 Start Live Tracking'
            )}
          </button>

          {/* Status Display */}
          {status && (
            <div className={`mt-4 sm:mt-6 p-3 sm:p-4 rounded-xl font-medium text-sm sm:text-base ${
              status.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
              status.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
              'bg-blue-100 text-blue-800 border border-blue-200'
            }`}>
              {status.message}
            </div>
          )}

          {/* Location Info */}
          {location && (
            <div className="bg-gray-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 mt-4 sm:mt-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">📍 Your Location</h3>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-white rounded-lg sm:rounded-xl shadow-sm gap-2 sm:gap-0">
                  <span className="font-semibold text-gray-600 text-sm sm:text-base">Latitude:</span>
                  <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
                    <span className="text-gray-800 font-mono text-sm sm:text-base break-all">{location.latitude?.toFixed(6) || '-'}</span>
                    <button 
                      onClick={() => copyToClipboard(location.latitude?.toFixed(6), 'Latitude')}
                      className="bg-blue-500 text-white border-none rounded-md px-2 sm:px-3 py-2 cursor-pointer text-sm transition-all duration-200 hover:bg-blue-600 hover:scale-105 active:scale-95 opacity-80 hover:opacity-100 touch-manipulation min-w-[44px] min-h-[44px]" 
                      title="Copy latitude"
                    >
                      📋
                    </button>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-white rounded-lg sm:rounded-xl shadow-sm gap-2 sm:gap-0">
                  <span className="font-semibold text-gray-600 text-sm sm:text-base">Longitude:</span>
                  <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
                    <span className="text-gray-800 font-mono text-sm sm:text-base break-all">{location.longitude?.toFixed(6) || '-'}</span>
                    <button 
                      onClick={() => copyToClipboard(location.longitude?.toFixed(6), 'Longitude')}
                      className="bg-blue-500 text-white border-none rounded-md px-2 sm:px-3 py-2 cursor-pointer text-sm transition-all duration-200 hover:bg-blue-600 hover:scale-105 active:scale-95 opacity-80 hover:opacity-100 touch-manipulation min-w-[44px] min-h-[44px]" 
                      title="Copy longitude"
                    >
                      📋
                    </button>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-white rounded-lg sm:rounded-xl shadow-sm gap-2 sm:gap-0">
                  <span className="font-semibold text-gray-600 text-sm sm:text-base">Accuracy:</span>
                  <span className="text-gray-800 font-mono text-sm sm:text-base">{location.accuracy ? `${location.accuracy.toFixed(2)} meters` : '-'}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-white rounded-lg sm:rounded-xl shadow-sm gap-2 sm:gap-0">
                  <span className="font-semibold text-gray-600 text-sm sm:text-base">Location Name:</span>
                  <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
                    <span className="text-gray-800 font-mono text-sm sm:text-base break-all text-right sm:text-left">{locationName || '-'}</span>
                    <button 
                      onClick={() => copyToClipboard(locationName, 'Location Name')}
                      className="bg-blue-500 text-white border-none rounded-md px-2 sm:px-3 py-2 cursor-pointer text-sm transition-all duration-200 hover:bg-blue-600 hover:scale-105 active:scale-95 opacity-80 hover:opacity-100 touch-manipulation min-w-[44px] min-h-[44px]" 
                      title="Copy location name"
                    >
                      📋
                    </button>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-white rounded-lg sm:rounded-xl shadow-sm gap-2 sm:gap-0">
                  <span className="font-semibold text-gray-600 text-sm sm:text-base">Timestamp:</span>
                  <span className="text-gray-800 font-mono text-sm sm:text-base break-all text-right sm:text-left">
                    {location.timestamp ? new Date(location.timestamp).toLocaleString() : '-'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Map */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl p-3 sm:p-4 lg:p-6 flex flex-col flex-1 order-1 lg:order-2">
          <div className="bg-gray-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 mt-2 sm:mt-4 flex-1 flex flex-col">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">🗺️ Interactive Map</h3>
            <div 
              ref={mapRef}
              className="bg-gray-200 border-2 border-gray-300 rounded-lg sm:rounded-xl shadow-lg mb-3 sm:mb-4 flex-1 min-h-[250px] sm:min-h-[300px] lg:min-h-0"
            >
              {!mapInstanceRef.current && (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm sm:text-base">
                  Loading map...
                </div>
              )}
            </div>
            <div className="flex justify-center gap-2 sm:gap-3">
              <button 
                onClick={zoomIn}
                className="bg-blue-500 text-white border-none rounded-lg px-3 sm:px-4 py-2 sm:py-3 cursor-pointer text-base sm:text-lg transition-all duration-200 hover:bg-blue-600 hover:-translate-y-1 hover:shadow-lg active:translate-y-0 touch-manipulation min-w-[44px] min-h-[44px]" 
                title="Zoom In"
              >
                ➕
              </button>
              <button 
                onClick={zoomOut}
                className="bg-blue-500 text-white border-none rounded-lg px-3 sm:px-4 py-2 sm:py-3 cursor-pointer text-base sm:text-lg transition-all duration-200 hover:bg-blue-600 hover:-translate-y-1 hover:shadow-lg active:translate-y-0 touch-manipulation min-w-[44px] min-h-[44px]" 
                title="Zoom Out"
              >
                ➖
              </button>
              <button 
                onClick={centerMap}
                className="bg-blue-500 text-white border-none rounded-lg px-3 sm:px-4 py-2 sm:py-3 cursor-pointer text-base sm:text-lg transition-all duration-200 hover:bg-blue-600 hover:-translate-y-1 hover:shadow-lg active:translate-y-0 touch-manipulation min-w-[44px] min-h-[44px]" 
                title="Center on Location"
              >
                🎯
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LocationTracker
