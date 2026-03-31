import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Licenses from './pages/Licenses'
import Explore from './pages/Explore'
import Activity from './pages/Activity'
import MyAccess from './pages/MyAccess'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route element={<Layout />}>
        <Route path="/vault" element={<Dashboard />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/licenses" element={<Licenses />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/access" element={<MyAccess />} />
        <Route path="/activity" element={<Activity />} />
      </Route>
    </Routes>
  )
}
