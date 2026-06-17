CREATE TABLE IF NOT EXISTS bids (
    id UUID PRIMARY KEY,
    property_id UUID REFERENCES properties(id),
    bidder_id UUID,
    amount NUMERIC,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    status TEXT CHECK (status IN ('active', 'outbid', 'winning', 'withdrawn'))
);

CREATE INDEX IF NOT EXISTS idx_bids_property_id ON bids(property_id);
CREATE INDEX IF NOT EXISTS idx_bids_bidder_id ON bids(bidder_id);