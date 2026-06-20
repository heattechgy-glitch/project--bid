import React, { useEffect, useState } from 'react';
import { fetchListings } from '../api/listings';
import ListingCard from '../components/ListingCard';
import './Properties.css';

const Properties = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadListings = async () => {
      try {
        const data = await fetchListings();
        setListings(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadListings();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="properties">
      <h1>Available Properties</h1>
      <div className="properties-list">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  );
};

export default Properties;
