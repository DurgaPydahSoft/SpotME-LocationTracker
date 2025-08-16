import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import UserDashboard from './user/UserDashboard'
import AdminDashboard from './admin/AdminDashboard'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<UserDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  )
}

export default App
