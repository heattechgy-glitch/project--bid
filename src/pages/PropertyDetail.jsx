import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { APP_NAME } from '../config';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [property, setProperty] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [bidding, setBidding] = useState(false);
  const [bidError, setBidError] = useState('');
  const [bidSuccess, setBidSuccess] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAllImages, setShowAllImages] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showShowingModal, setShowShowingModal] = useState(false);
  const [showingForm, setShowingForm] = useState({
    requested_date: '',
    requested_time: '',
    notes: ''
  });
  const [submittingShowing, setSubmittingShowing] = useState(false);
  const [showingSuccess, setShowingSuccess] = useState('');
  const [isFavorited, setIsFavorited] = useState(false);
  const [escrowCompany, setEscrowCompany] = useState(null);

  useEffect(() => {
    fetchProperty();
    fetchCurrentUser();
  }, [id]);

  useEffect(() => {
    if (property && isAuctionType(property.listing_type) && property.auction_end_date) {
      const timer = setInterval(() => {
        const remaining = calculateTimeRemaining(property.auction_end_date);
        setTimeRemaining(remaining);
        if (remaining.total <= 0) {
          clearInterval(timer);
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [property]);

  useEffect(() => {
    if (property && property.lat && property.lng) {
      const map = new mapboxgl.Map({
        container: 'property-map',
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [property.lng, property.lat],
        zoom: 15
      });

      new mapboxgl.Marker({ color: '#3b82f6' })
        .setLngLat([property.lng, property.lat])
        .addTo(map);

      map.addControl(new mapboxgl.NavigationControl());

      return () => map.remove();
    }
  }, [property]);

  useEffect(() => {
    if (currentUser && property) {
      checkFavoriteStatus();
    }
  }, [currentUser, property]);

  const fetchProperty = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProperty(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    const user = await supabase.auth.getUser();
    setCurrentUser(user.data);
  };

  const isAuctionType = (listingType) => {
    return listingType.includes('auction');
  };

  const calculateTimeRemaining = (endDate) => {
    const total = Date.parse(endDate) - Date.now();
    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    return { total, days, hours, minutes, seconds };
  };

  const checkFavoriteStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('property_id', property.id)
        .single();

      if (error) throw error;
      setIsFavorited(!!data);
    } catch (err) {
      console.error(err.message);
    }
  };

  const submitBid = async () => {
    setBidding(true);
    setBidError('');
    setBidSuccess('');

    try {
      let { error } = await supabase
        .from('bids')
        .insert({
          property_id: property.id,
          user_id: currentUser.id,
          bid_amount: bidAmount
        });
      if (error) throw error;

      setBidSuccess('Bid submitted successfully');
      setBidAmount('');
    } catch (err) {
      setBidError('Failed to submit bid');
      console.error(err);
    } finally {
      setBidding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-white text-2xl mb-4">Error Loading Property</h2>
          <p className="text-gray-400 mb-4">{error || 'Property not found.'}</p>
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => navigate('/')}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const images = property.images || [];
  const hasVirtualTour = property.virtual_tour_url;

  return (
    <div className="property-detail">
      <h1 className="text-3xl font-bold mb-4">{property.title}</h1>
      <p className="text-xl mb-4 text-gray-400">{property.address}</p>
      <div className="image-gallery mb-4">
        {showAllImages ? (
          images.map((img, index) => (
            <img key={index} src={img.url} alt={`Property image ${index + 1}`} className="w-full mb-2" />
          ))
        ) : (
          <img src={images[currentImageIndex]?.url} alt="Main property" className="w-full" />
        )}
        <button
          className="mt-2 text-blue-500"
          onClick={() => setShowAllImages(!showAllImages)}
        >
          {showAllImages ? 'Show Less' : 'Show All Images'}
        </button>
      </div>
      <div id="property-map" className="mapbox mb-4" style={{ height: '400px' }}></div>

      {hasVirtualTour && (
        <iframe
          className="mb-4"
          src={property.virtual_tour_url}
          width="100%"
          height="400"
          frameBorder="0"
          allowFullScreen
          title="Virtual Tour"
        />
      )}

      <div className="description mb-4">
        <h2 className="text-2xl font-bold mb-2">Description</h2>
        <p>{property.description}</p>
      </div>

      <div className="open-house-dates mb-4">
        <h2 className="text-2xl font-bold mb-2">Open House Dates</h2>
        <ul>
          {property.open_house_dates.map((date, index) => (
            <li key={index} className="mb-1">{new Date(date).toLocaleString()}</li>
          ))}
        </ul>
      </div>

      {isAuctionType(property.listing_type) ? (
        <div>
          <h2 className="text-2xl font-bold mb-2">Place a Bid</h2>
          <input
            type="number"
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            placeholder="Enter your bid"
            className="border p-2 w-full mb-2"
          />
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-2"
            onClick={submitBid}
            disabled={bidding}
          >
            {bidding ? 'Submitting...' : 'Submit Bid'}
          </button>
          {bidSuccess && <p className="text-green-500 mb-2">{bidSuccess}</p>}
          {bidError && <p className="text-red-500 mb-2">{bidError}</p>}
        </div>
      ) : (
        <div>
          <h2 className="text-2xl font-bold mb-2">Make an Offer</h2>
          <p className="mb-2">Contact {property.owner_email} to make an offer.</p>
        </div>
      )}

      <div className="flex justify-end mt-4">
        <Link
          to="/"
          className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
        >
          Back to Listings
        </Link>
      </div>
    </div>
  );
}
