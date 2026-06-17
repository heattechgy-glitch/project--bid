-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    property_id INTEGER,
    bid_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create showings table
CREATE TABLE IF NOT EXISTS showings (
    id SERIAL PRIMARY KEY,
    property_id INTEGER NOT NULL,
    buyer_id INTEGER NOT NULL,
    buyer_name VARCHAR(100) NOT NULL,
    buyer_email VARCHAR(100) NOT NULL,
    seller_email VARCHAR(100) NOT NULL,
    requested_date DATE NOT NULL,
    requested_time TIME NOT NULL,
    status VARCHAR(50) NOT NULL,
    counter_date DATE,
    counter_time TIME,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create escrow_companies table
CREATE TABLE IF NOT EXISTS escrow_companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    website VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(100),
    states_available JSONB NOT NULL,
    payment_link VARCHAR(255),
    instructions TEXT,
    logo_url VARCHAR(255)
);