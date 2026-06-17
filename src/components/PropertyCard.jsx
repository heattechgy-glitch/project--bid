import React from 'react';
import { Carousel } from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css';
import config from '@/config';

const PropertyCard = ({ property }) => {
  const {
    images,
    address,
    current_bid,
    asking_price,
    monthly_rate,
    bedrooms,
    bathrooms,
    sq_ft,
    listing_type,
    status,
    auction_end_time
  } = property;

  const formatPrice = (price) => `$${price.toLocaleString()}`;

  const renderPrice = () => {
    if (listing_type === 'auction') {
      return formatPrice(current_bid);
    } else if (listing_type === 'sale') {
      return formatPrice(asking_price);
    } else if (listing_type === 'rent') {
      return formatPrice(monthly_rate) + '/month';
    }
  };

  const calculateTimeLeft = () => {
    const now = new Date();
    const end = new Date(auction_end_time);
    const timeLeft = end - now;
    if (timeLeft < 0) return {};
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
    return { hours, minutes, seconds };
  };

  const CountdownTimer = () => {
    const { hours, minutes, seconds } = calculateTimeLeft();
    if (hours === undefined) return null;
    return (
      <div className="countdown-timer">
        Auction ends in: {hours}h {minutes}m {seconds}s
      </div>
    );
  };

  return (
    <div className="property-card border rounded shadow-sm">
      <Carousel showThumbs={false} infiniteLoop useKeyboardArrows>
        {images.map((image, index) => (
          <div key={index}>
            <img src={image} alt={`Property image ${index + 1}`} />
          </div>
        ))}
      </Carousel>
      <div className="p-4">
        <h3 className="text-xl font-bold">{address}</h3>
        <p className="text-lg mt-2">Price: {renderPrice()}</p>
        <p className="mt-1 text-sm">
          {bedrooms} Beds • {bathrooms} Baths • {sq_ft} sq. ft.
        </p>
        {listing_type === 'auction' && <CountdownTimer />}
        <span className={`status-badge status-badge-${status.toLowerCase()}`}>
          {config.PROPERTY_STATUSES[status]}
        </span>
      </div>
    </div>
  );
};

export default PropertyCard;