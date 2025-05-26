import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import PostErrand from './pages/PostErrand'
import Dashboard from './pages/Dashboard'
import Navbar from './components/NavBar'
import Footer from './components/Footer'
import EditProfilePage from './pages/EditProfilePage'


const App = () => {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/post" element={<PostErrand />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/edit-profile" element={<EditProfilePage />} />
      </Routes>
      <Footer />
    </Router>
  )
}

export default App
