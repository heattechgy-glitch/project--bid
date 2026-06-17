import React, { useEffect, useState } from 'react';
import { supabase } from '@/supabaseClient';

const BidPanel = ({ auctionType, auctionEndDate, currentBid, propertyId }) => {
  const [bid, setBid] = useState(currentBid);
  const [bidHistory, setBidHistory] = useState([]);
  const [newBid, setNewBid] = useState(currentBid);
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(auctionEndDate) - +new Date();
      let timeLeft = '';

      if (difference > 0) {
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        timeLeft = `${hours}h ${minutes}m ${seconds}s`;
      }
      setTimeRemaining(timeLeft);
    };

    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [auctionEndDate]);

  useEffect(() => {
    if (auctionType.includes('AUCTION')) {
      const fetchBidHistory = async () => {
        const { data, error } = await supabase
          .from('bids')
          .select('*')
          .eq('property_id', propertyId);
        if (!error) setBidHistory(data);
      };
      fetchBidHistory();
    }
  }, [auctionType, propertyId]);

  const handleBidSubmission = async () => {
    if (newBid > currentBid) {
      const { error } = await supabase
        .from('bids')
        .insert([{ property_id: propertyId, bid_amount: newBid }]);
        
      if (!error) {
        setBid(newBid);
        setBidHistory((prevBids) => [...prevBids, { bid_amount: newBid }]);
      }
    }
  };

  const renderAuctionSection = () => (
    <div>
      <p>Current Bid: ${bid}</p>
      <input
        type="number"
        value={newBid}
        min={bid + 1}
        onChange={(e) => setNewBid(parseFloat(e.target.value))}
      />
      <button onClick={handleBidSubmission}>Submit Bid</button>
      <p>Time Remaining: {timeRemaining}</p>
      <ul>
        {bidHistory.map((b, index) => (
          <li key={index}>Bid: ${b.bid_amount}</li>
        ))}
      </ul>
    </div>
  );

  const renderFixedSaleSection = () => (
    <button>Submit Offer</button>
  );

  const renderFixedRentSection = () => (
    <button>Submit Application</button>
  );

  return (
    <div>
      {auctionType === 'SALE_AUCTION' || auctionType === 'RENT_AUCTION' ? renderAuctionSection() : null}
      {auctionType === 'SALE_FIXED' ? renderFixedSaleSection() : null}
      {auctionType === 'RENT_FIXED' ? renderFixedRentSection() : null}
    </div>
  );
};

export default BidPanel;