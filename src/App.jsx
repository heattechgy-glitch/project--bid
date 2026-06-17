import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import CreateListing from './pages/CreateListing.jsx';
import PropertyDetail from './pages/PropertyDetail.jsx';
import Notifications from './pages/Notifications.jsx';
import Navbar from './components/Navbar.jsx';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <Routes>
        <Route path="/createlisting" element={<CreateListing />} />
        <Route path="/propertydetail" element={<PropertyDetail />} />
        <Route path="/notifications" element={<Notifications />} />
      </Routes>
    </div>
  );
}

export default App;