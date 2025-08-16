# 📍 Location Tracker - Live

A modern location tracking application built with **React + Vite** frontend and **Node.js** backend, featuring **live tracking every 3 seconds** for real-time location updates.

## 🚀 Features

### **Live Location Tracking**
- **Real-time updates** every 3 seconds
- **Single location reading** per update (no more 5-readings averaging)
- **High accuracy** GPS positioning
- **Live status updates** and progress indicators

### **Modern UI/UX**
- **React + Vite** frontend for fast development
- **Tailwind CSS** for responsive, mobile-friendly design
- **Two-column layout** (controls + map)
- **Mobile-first** responsive design
- **Touch-optimized** buttons and interactions

### **Location Information**
- **Coordinates** (latitude/longitude) with copy functionality
- **Accuracy** in meters
- **Location name** from OpenStreetMap
- **Timestamp** of each update
- **Update counter** to track number of readings

### **Interactive Map**
- **Leaflet.js** integration
- **Real-time updates** as location changes
- **Map controls** (zoom in/out, center)
- **Location markers** with detailed popups

## 🏗️ Project Structure

```
Location Tracker/
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/          # Custom hooks
│   │   ├── App.jsx         # Main app component
│   │   └── main.jsx        # Entry point
│   ├── package.json        # Frontend dependencies
│   ├── vite.config.js      # Vite configuration
│   └── tailwind.config.js  # Tailwind CSS config
├── backend/                 # Node.js backend
│   ├── server.js           # Express server
│   └── package.json        # Backend dependencies
└── README.md               # This file
```

## 🛠️ Technology Stack

### **Frontend**
- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Leaflet.js** - Interactive maps

### **Backend**
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **HTTPS** - Built-in HTTP client for geocoding

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Modern web browser** with geolocation support

## 🚀 Installation & Setup

### **1. Clone the Repository**
```bash
git clone <repository-url>
cd Location-Tracker
```

### **2. Install Frontend Dependencies**
```bash
cd frontend
npm install
```

### **3. Install Backend Dependencies**
```bash
cd ../backend
npm install
```

### **4. Build Frontend**
```bash
cd ../frontend
npm run build
```

## 🎯 Running the Application

### **Option 1: Production Mode (Recommended)**
1. **Build the frontend:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Start the backend server:**
   ```bash
   cd ../backend
   npm start
   ```

3. **Open your browser** and navigate to `http://localhost:3000`

### **Option 2: Development Mode**
1. **Start backend server:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start frontend dev server:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Open your browser** and navigate to `http://localhost:3001`

## 🔧 Configuration

### **Frontend Port**
- **Development**: Port 3001 (configurable in `vite.config.js`)
- **Production**: Served by backend on port 3000

### **Backend Port**
- **Default**: Port 3000 (configurable via `PORT` environment variable)

### **API Proxy**
- Frontend development server proxies `/api` requests to backend
- Production serves static files from backend

## 📱 Live Tracking Features

### **How It Works**
1. **Click "Start Live Tracking"** to begin
2. **Immediate location** is obtained
3. **Every 3 seconds** a new location reading is taken
4. **Real-time updates** to UI and map
5. **Server logging** of all location updates

### **Tracking Options**
- **Start/Stop** tracking at any time
- **Real-time status** updates
- **Error handling** for location failures
- **Automatic cleanup** when stopping

## 🗺️ Map Integration

### **Features**
- **Interactive Leaflet map**
- **Real-time location markers**
- **Zoom and pan controls**
- **Location popups** with detailed info
- **Responsive design** for all screen sizes

## 📊 API Endpoints

### **GET /api/test**
- Server health check
- Returns server status

### **GET /api/geocode**
- Reverse geocoding via OpenStreetMap
- Parameters: `lat`, `lng`
- Returns location name and details

### **POST /api/location**
- Receives location data from frontend
- Logs all location updates
- Returns success/error response

## 🎨 Customization

### **Styling**
- **Tailwind CSS** classes for easy customization
- **Responsive breakpoints** for mobile/desktop
- **Custom animations** and transitions
- **Mobile-optimized** touch targets

### **Tracking Interval**
- **Modify** the 3-second interval in `useLocationTracking.js`
- **Adjust** GPS accuracy settings
- **Customize** error handling and retry logic

## 🐛 Troubleshooting

### **Common Issues**

#### **Location Not Working**
- Ensure **HTTPS** or **localhost** (geolocation requirement)
- Check **browser permissions** for location access
- Verify **GPS** is enabled on mobile devices

#### **Map Not Loading**
- Check **Leaflet.js** CDN availability
- Verify **internet connection** for map tiles
- Check **browser console** for JavaScript errors

#### **Backend Connection Issues**
- Verify **backend server** is running
- Check **port conflicts** (3000, 3001)
- Ensure **API endpoints** are accessible

### **Debug Mode**
- **Frontend**: Check browser console for React logs
- **Backend**: Check terminal for server logs
- **Network**: Use browser dev tools to monitor API calls

## 🔮 Future Enhancements

### **Planned Features**
- **Route tracking** and path visualization
- **Location history** and playback
- **Export functionality** (GPX, KML)
- **Multiple device** synchronization
- **Offline map** support
- **Push notifications** for location updates

### **Technical Improvements**
- **WebSocket** for real-time communication
- **Database integration** for location storage
- **Authentication** and user management
- **API rate limiting** and security
- **Performance optimization** for mobile devices

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch
3. **Make** your changes
4. **Test** thoroughly
5. **Submit** a pull request

## 📄 License

This project is licensed under the **MIT License** - see the LICENSE file for details.

## 🙏 Acknowledgments

- **OpenStreetMap** for map data and geocoding
- **Leaflet.js** for interactive maps
- **Tailwind CSS** for beautiful styling
- **React** and **Vite** for modern development

## 📞 Support

For questions, issues, or contributions:
- **Create an issue** on GitHub
- **Check the documentation** above
- **Review troubleshooting** section

---

**Happy Location Tracking! 🎯📍**
