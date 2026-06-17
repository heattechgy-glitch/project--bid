import React, { useState, useEffect } from 'react';
import config from '@/config';

const PropertyForm = () => {
  const [listingType, setListingType] = useState('');
  const [formData, setFormData] = useState({
    starting_price: '',
    reserve_price: '',
    auction_end_date: '',
    asking_price: '',
    monthly_rate: '',
    images: [],
    parcels: [],
    multiParcelToggle: false,
    // Include all other 47+ property fields here...
  });

  const handleListingTypeChange = (event) => {
    setListingType(event.target.value);
    setFormData({ ...formData, starting_price: '', reserve_price: '', auction_end_date: '', asking_price: '', monthly_rate: '' });
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    setFormData({ ...formData, images: files });
  };

  const handleParcelToggle = () => {
    setFormData({ ...formData, multiParcelToggle: !formData.multiParcelToggle });
  };

  const handleFormSubmit = (event) => {
    event.preventDefault();
    // Handle form submission logic, e.g., sending data to API
  };

  return (
    <form onSubmit={handleFormSubmit}>
      <select value={listingType} onChange={handleListingTypeChange}>
        {config.LISTING_TYPES.map((type) => (
          <option key={type} value={type}>{type}</option>
        ))}
      </select>

      {(listingType === 'SALE_AUCTION' || listingType === 'RENT_AUCTION') && (
        <>
          <input type="number" name="starting_price" value={formData.starting_price} onChange={handleInputChange} placeholder="Starting Price" />
          <input type="number" name="reserve_price" value={formData.reserve_price} onChange={handleInputChange} placeholder="Reserve Price" />
          <input type="date" name="auction_end_date" value={formData.auction_end_date} onChange={handleInputChange} placeholder="Auction End Date" />
        </>
      )}

      {listingType === 'SALE_FIXED' && (
        <input type="number" name="asking_price" value={formData.asking_price} onChange={handleInputChange} placeholder="Asking Price" />
      )}

      {listingType === 'RENT_FIXED' && (
        <input type="number" name="monthly_rate" value={formData.monthly_rate} onChange={handleInputChange} placeholder="Monthly Rate" />
      )}

      <input type="file" multiple onChange={handleImageUpload} />

      <label>
        <input type="checkbox" checked={formData.multiParcelToggle} onChange={handleParcelToggle} />
        Multiple Parcels
      </label>

      {/* Render additional property fields here...
          Ensure all required fields for the property are included based on business requirements. */}

      <button type="submit">Submit</button>
    </form>
  );
};

export default PropertyForm;
