import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { APP_NAME, LISTING_TYPES } from '../config';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import PropertyForm from '../components/PropertyForm';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function CreateListing() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [escrowCompanies, setEscrowCompanies] = useState([]);
  const [mapContainer, setMapContainer] = useState(null);
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);
  const [previewImages, setPreviewImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    property_type: 'single_family',
    listing_type: 'sale_auction',
    address: '',
    city: '',
    state: '',
    zip: '',
    lat: null,
    lng: null,
    starting_price: '',
    reserve_price: '',
    asking_price: '',
    monthly_rate: '',
    lowest_rent_bid: '',
    auction_end_date: '',
    auction_end_time: '',
    lease_end_date: '',
    bedrooms: '',
    bathrooms: '',
    sq_ft: '',
    lot_size: '',
    year_built: '',
    parking_spaces: '',
    garage_spaces: '',
    stories: '',
    has_pool: false,
    has_garage: false,
    has_basement: false,
    has_fireplace: false,
    has_central_air: false,
    has_central_heat: false,
    is_waterfront: false,
    has_hoa: false,
    hoa_fee: '',
    virtual_tour_url: '',
    mls_number: '',
    escrow_company_id: '',
    open_house_dates: [],
    images: [],
    is_multi_parcel: false,
    parcels: []
  });

  useEffect(() => {
    if (mapContainer && !map) {
      const mapInstance = new mapboxgl.Map({
        container: mapContainer,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [-74.5, 40],
        zoom: 9
      });

      setMap(mapInstance);
      mapInstance.on('click', (e) => {
        const { lng, lat } = e.lngLat;
        if (marker) marker.remove();
        const newMarker = new mapboxgl.Marker().setLngLat([lng, lat]).addTo(mapInstance);
        setMarker(newMarker);
        setFormData((prev) => ({ ...prev, lat, lng }));
      });
    }

    return () => map?.remove();
  }, [mapContainer, map]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('properties')
        .insert([{ ...formData, images: JSON.stringify(formData.images) }]);
      if (error) throw error;
      navigate('/listings');
    } catch (error) {
      console.error(error);
      alert('Unable to create listing. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploadingImages(true);
    const newPreviews = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: true
    }));
    setPreviewImages((prev) => [...prev, ...newPreviews]);
    const uploadedUrls = [];

    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `listings/${fileName}`;
      const { data, error } = await supabase.storage.from('property-images').upload(filePath, file);
      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage.from('property-images').getPublicUrl(filePath);
        uploadedUrls.push(publicUrl);
      }
    }

    setFormData((prev) => ({ ...prev, images: [...prev.images, ...uploadedUrls] }));
    setPreviewImages((prev) => prev.map((p) => ({ ...p, uploading: false })));
    setUploadingImages(false);
  };

  const removeImage = (index) => {
    setPreviewImages((prev) => prev.filter((_, i) => i !== index));
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const validateStep = (step) => {
    const newErrors = {};
    switch (step) {
      case 1:
        if (!formData.title.trim()) newErrors.title = 'Title is required';
        if (!formData.property_type) newErrors.property_type = 'Property type is required';
        if (!formData.listing_type) newErrors.listing_type = 'Listing type is required';
        break;
      case 2:
        if (!formData.address.trim()) newErrors.address = 'Address is required';
        if (!formData.city.trim()) newErrors.city = 'City is required';
        if (!formData.state.trim()) newErrors.state = 'State is required';
        if (!formData.zip.trim()) newErrors.zip = 'ZIP code is required';
        break;
      case 3:
        if (!formData.bedrooms && formData.property_type !== 'land') newErrors.bedrooms = 'Bedrooms is required';
        if (!formData.bathrooms && formData.property_type !== 'land') newErrors.bathrooms = 'Bathrooms is required';
        if (!formData.sq_ft && formData.property_type !== 'land') newErrors.sq_ft = 'Square footage is required';
        break;
      case 4:
        if (formData.listing_type === 'sale_auction') {
          if (!formData.starting_price) newErrors.starting_price = 'Starting price is required';
          if (!formData.reserve_price) newErrors.reserve_price = 'Reserve price is required';
          if (!formData.auction_end_date) newErrors.auction_end_date = 'Auction end date is required';
          if (!formData.auction_end_time) newErrors.auction_end_time = 'Auction end time is required';
        }
        break;
      default:
        break;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return (
    <div>
      <h1>{`${APP_NAME} - Create Listing`}</h1>
      <form onSubmit={handleSubmit}>
        {LISTING_TYPES.map((type) => (
          <label key={type}>
            <input
              type="radio"
              name="listing_type"
              value={type}
              checked={formData.listing_type === type}
              onChange={() => setFormData((prev) => ({ ...prev, listing_type: type }))}
            />
            {type}
          </label>
        ))}
        <PropertyForm
          formData={formData}
          setFormData={setFormData}
          errors={errors}
          validateStep={validateStep}
        />
        <div>
          <h2>Images</h2>
          <input type="file" multiple onChange={handleImageUpload} disabled={uploadingImages} />
          {previewImages.map((image, index) => (
            <div key={index}>
              <img src={image.preview} alt="preview" />
              {image.uploading && <p>Uploading...</p>}
              <button type="button" onClick={() => removeImage(index)}>Remove</button>
            </div>
          ))}
        </div>
        <button type="submit" disabled={isSubmitting}>Submit Listing</button>
      </form>
    </div>
  );
}