import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { Home, DollarSign, Users, TrendingUp, Clock, CheckCircle, XCircle, Calendar, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [bids, setBids] = useState([]);
  const [stats, setStats] = useState({
    totalProperties: 0,
    activeAuctions: 0,
    totalBids: 0,
    totalRevenue: 0,
    totalUsers: 0
  });
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [extendDeadline, setExtendDeadline] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    checkAdminAccess();
    loadDashboardData();
  }, []);

  async function checkAdminAccess() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      navigate("/");
    }
  }

  async function loadDashboardData() {
    setLoading(true);
    try {
      const [propsRes, bidsRes, usersRes] = await Promise.all([
        supabase.from("properties").select("*").order("created_at", { ascending: false }),
        supabase.from("bids").select("*, properties(address), profiles(email)").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id")
      ]);

      if (propsRes.data) {
        setProperties(propsRes.data);
        const active = propsRes.data.filter(p => p.status === "active").length;
        const revenue = propsRes.data
          .filter(p => p.status === "sold")
          .reduce((sum, p) => sum + (p.current_bid || 0), 0);

        setStats(prev => ({
          ...prev,
          totalProperties: propsRes.data.length,
          activeAuctions: active,
          totalRevenue: revenue
        }));
      }

      if (bidsRes.data) {
        setBids(bidsRes.data);
        setStats(prev => ({ ...prev, totalBids: bidsRes.data.length }));
      }

      if (usersRes.data) {
        setStats(prev => ({ ...prev, totalUsers: usersRes.data.length }));
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  async function closeAuction(propertyId) {
    if (!confirm("Are you sure you want to close this auction early?")) return;

    setActionLoading(true);
    try {
      const property = properties.find(p => p.id === propertyId);
      if (!property) return;

      const propertyBids = bids.filter(b => b.property_id === propertyId);
      const winningBid = propertyBids.sort((a, b) => b.amount - a.amount)[0];

      await supabase
        .from("properties")
        .update({
          status: "sold",
          winner_id: winningBid?.user_id || null
        })
        .eq("id", propertyId);

      await loadDashboardData();
      setSelectedProperty(null);
      alert("Auction closed successfully");
    } catch (error) {
      console.error("Error closing auction:", error);
      alert("Failed to close auction");
    } finally {
      setActionLoading(false);
    }
  }

  async function extendAuction(propertyId) {
    if (!extendDeadline) {
      alert("Please select a new deadline");
      return;
    }

    setActionLoading(true);
    try {
      await supabase
        .from("properties")
        .update({ auction_end: extendDeadline })
        .eq("id", propertyId);

      await loadDashboardData();
      setSelectedProperty(null);
      setExtendDeadline("");
      alert("Auction deadline extended successfully");
    } catch (error) {
      console.error("Error extending auction:", error);
      alert("Failed to extend auction");
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteProperty(propertyId) {
    if (!confirm("Are you sure you want to delete this property? This action cannot be undone.")) return;

    setActionLoading(true);
    try {
      await supabase.from("bids").delete().eq("property_id", propertyId);
      await supabase.from("properties").delete().eq("id", propertyId);
      await loadDashboardData();
      setSelectedProperty(null);
      alert("Property deleted successfully");
    } catch (error) {
      console.error("Error deleting property:", error);
      alert("Failed to delete property");
    } finally {
      setActionLoading(false);
    }
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0
    }).format(amount);
  }

  function formatDate(date) {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-sky-500 text-xl">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-sky-500">Admin Dashboard</h1>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            Back to Home
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatCard
            icon={Home}
            label="Total Properties"
            value={stats.totalProperties}
            color="sky"
          />
          <StatCard
            icon={TrendingUp}
            label="Active Auctions"
            value={stats.activeAuctions}
            color="green"
          />
          <StatCard
            icon={DollarSign}
            label="Total Bids"
            value={stats.totalBids}
            color="yellow"
          />
          <StatCard
            icon={Users}
            label="Total Users"
            value={stats.totalUsers}
            color="purple"
          />
          <StatCard
            icon={DollarSign}
            label="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            color="sky"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-xl font-bold mb-4 text-sky-500">Properties</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {properties.map(property => (
                <div
                  key={property.id}
                  className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors cursor-pointer"
                  onClick={() => setSelectedProperty(property)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{property.address}</h3>
                      <p className="text-sm text-gray-400">{property.city}, {property.state}</p>
                    </div>
                    <span
                      className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        property.status === "active" && "bg-green-500/20 text-green-400",
                        property.status === "pending" && "bg-yellow-500/20 text-yellow-400",
                        property.status === "sold" && "bg-sky-500/20 text-sky-400"
                      )}
                    >
                      {property.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">
                      Current Bid: <span className="text-white font-semibold">{formatCurrency(property.current_bid || property.starting_bid)}</span>
                    </span>
                    {property.auction_end && (
                      <span className="text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(property.auction_end) > new Date() ? "Ends" : "Ended"}: {formatDate(property.auction_end)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-xl font-bold mb-4 text-sky-500">Recent Bids</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {bids.map(bid => (
                <div
                  key={bid.id}
                  className="bg-gray-800 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-white">{formatCurrency(bid.amount)}</p>
                      <p className="text-sm text-gray-400">{bid.properties?.address || "Unknown Property"}</p>
                    </div>
                    <span className="text-xs text-gray-500">{formatDate(bid.created_at)}</span>
                  </div>
                  <p className="text-xs text-gray-400">Bidder: {bid.profiles?.email || "Unknown"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {selectedProperty && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 rounded-xl p-6 max-w-2xl w-full border border-gray-800">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-sky-500">{selectedProperty.address}</h2>
                  <p className="text-gray-400">{selectedProperty.city}, {selectedProperty.state}</p>
                </div>
                <button
                  onClick={() => setSelectedProperty(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-400">Status</p>
                  <p className="text-lg font-semibold capitalize">{selectedProperty.status}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Current Bid</p>
                  <p className="text-lg font-semibold">{formatCurrency(selectedProperty.current_bid || selectedProperty.starting_bid)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Starting Bid</p>
                  <p className="text-lg font-semibold">{formatCurrency(selectedProperty.starting_bid)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Auction Ends</p>
                  <p className="text-lg font-semibold">{selectedProperty.auction_end ? formatDate(selectedProperty.auction_end) : "Not set"}</p>
                </div>
              </div>

              {selectedProperty.status === "active" && (
                <div className="space-y-4">
                  <div className="border-t border-gray-800 pt-4">
                    <label className="block text-sm font-medium mb-2">Extend Deadline</label>
                    <div className="flex gap-2">
                      <input
                        type="datetime-local"
                        value={extendDeadline}
                        onChange={(e) => setExtendDeadline(e.target.value)}
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-sky-500"
                      />
                      <button
                        onClick={() => extendAuction(selectedProperty.id)}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-sky-500 hover:bg-sky-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <Calendar className="w-4 h-4" />
                        Extend
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => closeAuction(selectedProperty.id)}
                    disabled={actionLoading}
                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Close Auction Early
                  </button>
                </div>
              )}

              <div className="border-t border-gray-800 pt-4 mt-4 flex gap-2">
                <button
                  onClick={() => navigate(`/property/${selectedProperty.id}`)}
                  className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View Details
                </button>
                <button