import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { APP_NAME } from '../config'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

export default function CreateListing() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [escrowCompanies, setEscrowCompanies] = useState([])
  const [mapContainer, setMapContainer] = useState(null)
  const [map, setMap] = useState(null)
  const [marker, setMarker] = useState(null)
  const [previewImages, setPreviewImages] = useState([])
  const [uploadingImages, setUploadingImages] = useState(false)

  const [formData, setFormData] = useState({
    // Basic Info
    title: '',
    description: '',
    property_type: 'single_family',
    listing_type: 'sale_auction',
    
    // Location
    address: '',
    city: '',
    state: '',
    zip: '',
    lat: null,
    lng: null,
    
    // Pricing
    starting_price: '',
    reserve_price: '',
    asking_price: '',
    monthly_rate: '',
    lowest_rent_bid: '',
    auction_end_date: '',
    auction_end_time: '',
    lease_end_date: '',
    
    // Property Details
    bedrooms: '',
    bathrooms: '',
    sq_ft: '',
    lot_size: '',
    year_built: '',
    parking_spaces: '',
    garage_spaces: '',
    stories: '',
    
    // Features
    has_pool: false,
    has_garage: false,
    has_basement: false,
    has_fireplace: false,
    has_central_air: false,
    has_central_heat: false,
    is_waterfront: false,
    has_hoa: false,
    hoa_fee: '',
    
    // Additional
    virtual_tour_url: '',
    mls_number: '',
    escrow_company_id: '',
    open_house_dates: [],
    images: [],
    
    // Multi-parcel
    is_multi_parcel: false,
    parcels: []
  })

  const propertyTypes = [
    { value: 'single_family', label: 'Single Family Home' },
    { value: 'condo', label: 'Condo/Townhouse' },
    { value: 'multi_family', label: 'Multi-Family' },
    { value: 'land', label: 'Land/Lot' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'industrial', label: 'Industrial' },
    { value: 'mobile_home', label: 'Mobile/Manufactured Home' },
    { value: 'farm', label: 'Farm/Ranch' }
  ]

  const listingTypes = [
    { value: 'sale_auction', label: 'For Sale — Auction', description: 'Bidders compete in real time. Highest bid wins.' },
    { value: 'sale_fixed', label: 'For Sale — Set Price', description: 'Fixed asking price. Buyer submits offer.' },
    { value: 'rent_auction', label: 'For Rent — Open Bidding', description: 'Renters bid against each other.' },
    { value: 'rent_fixed', label: 'For Rent — Fixed Rate', description: 'Fixed monthly rate. Applicants submit interest.' }
  ]

  const steps = [
    { number: 1, title: 'Listing Type' },
    { number: 2, title: 'Location' },
    { number: 3, title: 'Details' },
    { number: 4, title: 'Pricing' },
    { number: 5, title: 'Photos' },
    { number: 6, title: 'Review' }
  ]

  useEffect(() => {
    fetchEscrowCompanies()
  }, [])

  useEffect(() => {
    if (currentStep === 2 && mapContainer && !map) {
      const newMap = new mapboxgl.Map({
        container: mapContainer,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-98.5795, 39.8283],
        zoom: 3
      })

      newMap.addControl(new mapboxgl.NavigationControl(), 'top-right')

      newMap.on('click', (e) => {
        const { lng, lat } = e.lngLat
        setFormData(prev => ({ ...prev, lat, lng }))
        
        if (marker) {
          marker.setLngLat([lng, lat])
        } else {
          const newMarker = new mapboxgl.Marker({ color: '#3b82f6' })
            .setLngLat([lng, lat])
            .addTo(newMap)
          setMarker(newMarker)
        }

        reverseGeocode(lng, lat)
      })

      setMap(newMap)

      return () => newMap.remove()
    }
  }, [currentStep, mapContainer])

  const fetchEscrowCompanies = async () => {
    const { data, error } = await supabase
      .from('escrow_companies')
      .select('*')
      .order('name')

    if (!error && data) {
      setEscrowCompanies(data)
    }
  }

  const reverseGeocode = async (lng, lat) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}`
      )
      const data = await response.json()

      if (data.features && data.features.length > 0) {
        const feature = data.features[0]
        const context = feature.context || []

        let address = feature.address ? `${feature.address} ${feature.text}` : feature.text
        let city = ''
        let state = ''
        let zip = ''

        context.forEach(item => {
          if (item.id.startsWith('place')) city = item.text
          if (item.id.startsWith('region')) state = item.short_code?.replace('US-', '') || item.text
          if (item.id.startsWith('postcode')) zip = item.text
        })

        setFormData(prev => ({
          ...prev,
          address: address || prev.address,
          city: city || prev.city,
          state: state || prev.state,
          zip: zip || prev.zip
        }))
      }
    } catch (error) {
      console.error('Geocoding error:', error)
    }
  }

  const geocodeAddress = async () => {
    const fullAddress = `${formData.address}, ${formData.city}, ${formData.state} ${formData.zip}`
    
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?access_token=${mapboxgl.accessToken}`
      )
      const data = await response.json()

      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center
        setFormData(prev => ({ ...prev, lat, lng }))

        if (map) {
          map.flyTo({ center: [lng, lat], zoom: 15 })
          
          if (marker) {
            marker.setLngLat([lng, lat])
          } else {
            const newMarker = new mapboxgl.Marker({ color: '#3b82f6' })
              .setLngLat([lng, lat])
              .addTo(map)
            setMarker(newMarker)
          }
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    setUploadingImages(true)

    const newPreviews = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: true
    }))

    setPreviewImages(prev => [...prev, ...newPreviews])

    const uploadedUrls = []

    for (const file of files) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `listings/${fileName}`

      const { data, error } = await supabase.storage
        .from('property-images')
        .upload(filePath, file)

      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage
          .from('property-images')
          .getPublicUrl(filePath)
        
        uploadedUrls.push(publicUrl)
      }
    }

    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...uploadedUrls]
    }))

    setPreviewImages(prev => prev.map(p => ({ ...p, uploading: false })))
    setUploadingImages(false)
  }

  const removeImage = (index) => {
    setPreviewImages(prev => prev.filter((_, i) => i !== index))
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }))
  }

  const validateStep = (step) => {
    const newErrors = {}

    switch (step) {
      case 1:
        if (!formData.title.trim()) newErrors.title = 'Title is required'
        if (!formData.property_type) newErrors.property_type = 'Property type is required'
        if (!formData.listing_type) newErrors.listing_type = 'Listing type is required'
        break

      case 2:
        if (!formData.address.trim()) newErrors.address = 'Address is required'
        if (!formData.city.trim()) newErrors.city = 'City is required'
        if (!formData.state.trim()) newErrors.state = 'State is required'
        if (!formData.zip.trim()) newErrors.zip = 'ZIP code is required'
        break

      case 3:
        if (!formData.bedrooms && formData.property_type !== 'land') newErrors.bedrooms = 'Bedrooms is required'
        if (!formData.bathrooms && formData.property_type !== 'land') newErrors.bathrooms = 'Bathrooms is required'
        if (!formData.sq_ft && formData.property_type !== 'land') newErrors.sq_ft = 'Square footage is required'
        break

      case 4:
        if (formData.listing_type === 'sale_auction') {
          if (!formData.starting