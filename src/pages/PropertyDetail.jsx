import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { APP_NAME } from '../config'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

export default function PropertyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [property, setProperty] = useState(null)
  const [bids, setBids] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [bidAmount, setBidAmount] = useState('')
  const [bidding, setBidding] = useState(false)
  const [bidError, setBidError] = useState('')
  const [bidSuccess, setBidSuccess] = useState('')
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showAllImages, setShowAllImages] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(null)
  const [showShowingModal, setShowShowingModal] = useState(false)
  const [showingForm, setShowingForm] = useState({
    requested_date: '',
    requested_time: '',
    notes: ''
  })
  const [submittingShowing, setSubmittingShowing] = useState(false)
  const [showingSuccess, setShowingSuccess] = useState('')
  const [isFavorited, setIsFavorited] = useState(false)
  const [escrowCompany, setEscrowCompany] = useState(null)

  useEffect(() => {
    fetchProperty()
    fetchCurrentUser()
  }, [id])

  useEffect(() => {
    if (property && isAuctionType(property.listing_type) && property.auction_end_date) {
      const timer = setInterval(() => {
        const remaining = calculateTimeRemaining(property.auction_end_date)
        setTimeRemaining(remaining)
        if (remaining.total <= 0) {
          clearInterval(timer)
        }
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [property])

  useEffect(() => {
    if (property && property.lat && property.lng) {
      const map = new mapboxgl.Map({
        container: 'property-map',
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [property.lng, property.lat],
        zoom: 15
      })

      new mapboxgl.Marker({ color: '#3b82f6' })
        .setLngLat([property.lng, property.lat])
        .addTo(map)

      map.addControl(new mapboxgl.NavigationControl())

      return () => map.remove()
    }
  }, [property])

  useEffect(() => {
    if (currentUser && property) {
      checkFavoriteStatus()
    }
  }, [currentUser, property])

  const fetchProperty = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setProperty(data)

      if (data.escrow_company_id) {
        const { data: escrow } = await supabase
          .from('escrow_companies')
          .select('*')
          .eq('id', data.escrow_company_id)
          .single()
        setEscrowCompany(escrow)
      }

      fetchBids(id)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchBids = async (propertyId) => {
    const { data } = await supabase
      .from('bids')
      .select('*, profiles:bidder_id(full_name, avatar_url)')
      .eq('property_id', propertyId)
      .order('amount', { ascending: false })
      .limit(10)
    
    if (data) setBids(data)
  }

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setCurrentUser({ ...user, ...profile })
    }
  }

  const checkFavoriteStatus = async () => {
    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', currentUser.id)
      .eq('property_id', property.id)
      .single()
    
    setIsFavorited(!!data)
  }

  const toggleFavorite = async () => {
    if (!currentUser) {
      navigate('/login')
      return
    }

    if (isFavorited) {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('property_id', property.id)
    } else {
      await supabase
        .from('favorites')
        .insert({ user_id: currentUser.id, property_id: property.id })
    }
    setIsFavorited(!isFavorited)
  }

  const isAuctionType = (type) => {
    return type === 'sale_auction' || type === 'rent_auction'
  }

  const calculateTimeRemaining = (endDate) => {
    const total = new Date(endDate) - new Date()
    const days = Math.floor(total / (1000 * 60 * 60 * 24))
    const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((total % (1000 * 60)) / 1000)
    return { total, days, hours, minutes, seconds }
  }

  const getMinimumBid = useCallback(() => {
    if (!property) return 0
    const currentHighest = property.current_bid || property.starting_price || 0
    return currentHighest + (property.listing_type === 'rent_auction' ? 50 : 1000)
  }, [property])

  const handleBidSubmit = async (e) => {
    e.preventDefault()
    setBidError('')
    setBidSuccess('')

    if (!currentUser) {
      navigate('/login')
      return
    }

    const amount = parseFloat(bidAmount)
    const minBid = getMinimumBid()

    if (isNaN(amount) || amount < minBid) {
      setBidError(`Minimum bid is ${formatCurrency(minBid)}`)
      return
    }

    if (property.listing_type === 'sale_auction' && property.reserve_price && amount < property.reserve_price) {
      setBidError(`This bid is below the reserve price`)
    }

    setBidding(true)

    try {
      const { error: bidError } = await supabase
        .from('bids')
        .insert({
          property_id: property.id,
          bidder_id: currentUser.id,
          amount,
          status: 'active'
        })

      if (bidError) throw bidError

      await supabase
        .from('bids')
        .update({ status: 'outbid' })
        .eq('property_id', property.id)
        .neq('bidder_id', currentUser.id)
        .eq('status', 'active')

      await supabase
        .from('properties')
        .update({ current_bid: amount })
        .eq('id', property.id)

      await supabase
        .from('notifications')
        .insert({
          user_id: property.owner_id,
          type: 'new_bid',
          message: `New bid of ${formatCurrency(amount)} on your property at ${property.address}`,
          property_id: property.id
        })

      setBidSuccess('Bid placed successfully!')
      setBidAmount('')
      fetchProperty()
      fetchBids(property.id)
    } catch (err) {
      setBidError(err.message)
    } finally {
      setBidding(false)
    }
  }

  const handleShowingSubmit = async (e) => {
    e.preventDefault()
    if (!currentUser) {
      navigate('/login')
      return
    }

    setSubmittingShowing(true)

    try {
      const { error } = await supabase
        .from('showings')
        .insert({
          property_id: property.id,
          buyer_id: currentUser.id,
          buyer_name: currentUser.full_name,
          buyer_email: currentUser.email,
          seller_email: property.owner_email,
          requested_date: showingForm.requested_date,
          requested_time: showingForm.requested_time,
          notes: showingForm.notes,
          status: 'pending'
        })

      if (error) throw error

      await supabase
        .from('notifications')
        .insert({
          user_id: property.owner_id,
          type: 'showing_request',
          message: `New showing request for ${property.address}`,
          property_id: property.id
        })

      setShowingSuccess('Showing request submitted successfully!')
      setShowShowingModal(false)
      setShowingForm({ requested_date: '', requested_time: '', notes: '' })
    } catch (err) {
      console.error(err)
    } finally {
      setSubmittingShowing(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getListingTypeLabel = (type) => {
    const labels = {
      sale_auction: 'For Sale — Auction',
      sale_fixed: 'For Sale — Set Price',
      rent_auction: 'For Rent — Open Bidding',
      rent_fixed: 'For Rent — Fixed Rate'
    }
    return labels[type] || type
  }

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-500',
      pending: 'bg-yellow-500',
      sold: 'bg-red-500',
      expired: 'bg-gray-500',
      closed: 'bg-gray-600'
    }
    return colors[status] || 'bg-gray-500'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">