import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Building2, TrendingUp, Clock, DollarSign, Eye, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default function SellerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [properties, setProperties] = useState([]);
  const [bids, setBids] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [revenueStats, setRevenueStats] = useState({
    total: 0,
    pending: 0,
    completed: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }
    setUser(user);
    await loadDashboardData(user.id);
  };

  const loadDashboardData = async (userId) => {
    setLoading(true);
    try {
      // Load properties owned by this seller
      const { data: propsData, error: propsError } = await supabase
        .from("properties")
        .select("*")
        .eq("seller_id", userId)
        .order("created_at", { ascending: false });

      if (propsError) throw propsError;
      setProperties(propsData || []);

      // Load bids on seller's properties
      const propertyIds = (propsData || []).map(p => p.id);
      if (propertyIds.length > 0) {
        const { data: bidsData, error: bidsError } = await supabase
          .from("bids")
          .select("*, properties(title, address), profiles(full_name, email)")
          .in("property_id", propertyIds)
          .order("created_at", { ascending: false });

        if (bidsError) throw bidsError;
        setBids(bidsData || []);

        // Calculate revenue stats
        const completed = (bidsData || []).filter(b => b.status === "accepted");
        const pending = (bidsData || []).filter(b => b.status === "pending");
        
        setRevenueStats({
          total: completed.reduce((sum, b) => sum + (b.amount || 0), 0),
          pending: pending.reduce((sum, b) => sum + (b.amount || 0), 0),
          completed: completed.length
        });
      }

      // Load pending viewing/inspection requests
      const { data: requestsData, error: requestsError } = await supabase
        .from("viewing_requests")
        .select("*, properties(title, address), profiles(full_name, email)")
        .in("property_id", propertyIds)
        .eq("status", "pending")
        .order("requested_date", { ascending: true });

      if (!requestsError) {
        setPendingRequests(requestsData || []);
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId) => {
    const { error } = await supabase
      .from("viewing_requests")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", requestId);

    if (!error) {
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    }
  };

  const handleRejectRequest = async (requestId) => {
    const { error } = await supabase
      .from("viewing_requests")
      .update({ status: "rejected", rejected_at: new Date().toISOString() })
      .eq("id", requestId);

    if (!error) {
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    }
  };

  const handleAcceptBid = async (bidId) => {
    const { error } = await supabase
      .from("bids")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", bidId);

    if (!error) {
      await loadDashboardData(user.id);
    }
  };

  const handleRejectBid = async (bidId) => {
    const { error } = await supabase
      .from("bids")
      .update({ status: "rejected", rejected_at: new Date().toISOString() })
      .eq("id", bidId);

    if (!error) {
      await loadDashboardData(user.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-sky-500 text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Seller Dashboard</h1>
          <p className="text-gray-400">Manage your properties and bids</p>
        </div>

        {/* Revenue Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total Revenue</span>
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-white">
              ${revenueStats.total.toLocaleString()}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Pending Bids Value</span>
              <Clock className="w-5 h-5 text-sky-500" />
            </div>
            <div className="text-2xl font-bold text-white">
              ${revenueStats.pending.toLocaleString()}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Completed Deals</span>
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-white">
              {revenueStats.completed}
            </div>
          </div>
        </div>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <h2 className="text-xl font-bold text-white">Pending Viewing Requests</h2>
              <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-1 rounded-full">
                {pendingRequests.length}
              </span>
            </div>

            <div className="space-y-3">
              {pendingRequests.map(request => (
                <div key={request.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">
                        {request.properties?.title}
                      </h3>
                      <p className="text-sm text-gray-400 mb-2">
                        {request.properties?.address}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{request.profiles?.full_name}</span>
                        <span>{request.profiles?.email}</span>
                        <span>Date: {new Date(request.requested_date).toLocaleDateString()}</span>
                      </div>
                      {request.message && (
                        <p className="text-sm text-gray-400 mt-2 italic">"{request.message}"</p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleApproveRequest(request.id)}
                        className="p-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                        title="Approve"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request.id)}
                        className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                        title="Reject"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Properties and Bids */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="w-5 h-5 text-sky-500" />
            <h2 className="text-xl font-bold text-white">My Properties</h2>
          </div>

          {properties.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">You haven't listed any properties yet</p>
              <button
                onClick={() => navigate("/list-property")}
                className="px-6 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors"
              >
                List Your First Property
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {properties.map(property => {
                const propertyBids = bids.filter(b => b.property_id === property.id);
                const pendingBids = propertyBids.filter(b => b.status === "pending");
                const acceptedBids = propertyBids.filter(b => b.status === "accepted");

                return (
                  <div key={property.id} className="bg-gray-800 border border-gray-700 rounded-lg p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-1">{property.title}</h3>
                        <p className="text-sm text-gray-400 mb-2">{property.address}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-sky-400 font-semibold">
                            ${property.price?.toLocaleString()}
                          </span>
                          <span className="text-gray-500">
                            {property.bedrooms} bed • {property.bathrooms} bath • {property.sqft} sqft
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/property/${property.id}`)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </div>

                    {/* Bids Summary */}
                    <div className="border-t border-gray-700 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-white">
                          Bids ({propertyBids.length})
                        </h4>
                        {pendingBids.length > 0 && (
                          <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-1 rounded-full">
                            {pendingBids.length} pending
                          </span>
                        )}
                      </div>

                      {propertyBids.length === 0 ? (
                        <p className="text-sm text-gray-500">No bids yet</p>
                      ) : (
                        <div className="space-y-2">
                          {propertyBids.slice(0, 3).map(bid => (
                            <div
                              key={bid.id}
                              className="flex items-center justify-between bg-gray-900 rounded-lg p-3"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                  <span className="font-semibold text-white">
                                    ${bid.amount?.toLocaleString()}
                                  </span>
                                  <span
                                    className={`text-xs px-2 py-1 rounded-full ${
                                      bid.status === "pending"
                                        ? "bg-amber-500/20 text-amber-400"
                                        : bid.status === "accepted"
                                        ? "bg-green-500/20 text-green-400"
                                        : "bg-red-500/20 text-red-400"
                                    }`}
                                  >
                                    {bid.status}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500">
                                  {bid.profiles?.full_name} • {new Date(bid.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              {bid.status === "pending" && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleAcceptBid(bid.id)}
                                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => handleRejectBid(bid.id)}
                                    className="px-3 py-1 bg-red-600 hover