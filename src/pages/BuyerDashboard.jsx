import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { Bell, Home, TrendingUp, Calendar, Eye, DollarSign, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BuyerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myBids, setMyBids] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [outbidAlerts, setOutbidAlerts] = useState([]);
  const [wonAuctions, setWonAuctions] = useState([]);
  const [showings, setShowings] = useState([]);
  const [activeTab, setActiveTab] = useState("bids");

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
      await Promise.all([
        loadMyBids(userId),
        loadWatchlist(userId),
        loadOutbidAlerts(userId),
        loadWonAuctions(userId),
        loadShowings(userId)
      ]);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyBids = async (userId) => {
    const { data, error } = await supabase
      .from("bids")
      .select(`
        *,
        property:properties(*)
      `)
      .eq("buyer_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setMyBids(data);
    }
  };

  const loadWatchlist = async (userId) => {
    const { data, error } = await supabase
      .from("watchlist")
      .select(`
        *,
        property:properties(*)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setWatchlist(data);
    }
  };

  const loadOutbidAlerts = async (userId) => {
    const { data, error } = await supabase
      .from("bids")
      .select(`
        *,
        property:properties(*)
      `)
      .eq("buyer_id", userId)
      .eq("status", "outbid")
      .order("updated_at", { ascending: false });

    if (!error && data) {
      setOutbidAlerts(data);
    }
  };

  const loadWonAuctions = async (userId) => {
    const { data, error } = await supabase
      .from("bids")
      .select(`
        *,
        property:properties(*)
      `)
      .eq("buyer_id", userId)
      .eq("status", "won")
      .order("updated_at", { ascending: false });

    if (!error && data) {
      setWonAuctions(data);
    }
  };

  const loadShowings = async (userId) => {
    const { data, error } = await supabase
      .from("showings")
      .select(`
        *,
        property:properties(*)
      `)
      .eq("buyer_id", userId)
      .order("scheduled_at", { ascending: true });

    if (!error && data) {
      setShowings(data);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "won":
        return "text-green-400";
      case "outbid":
        return "text-red-400";
      case "active":
        return "text-sky-400";
      case "pending":
        return "text-yellow-400";
      default:
        return "text-gray-400";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "won":
        return <CheckCircle className="w-5 h-5" />;
      case "outbid":
        return <AlertCircle className="w-5 h-5" />;
      case "active":
        return <TrendingUp className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const removeFromWatchlist = async (watchlistId) => {
    const { error } = await supabase
      .from("watchlist")
      .delete()
      .eq("id", watchlistId);

    if (!error && user) {
      await loadWatchlist(user.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-sky-400 text-xl">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-sky-400 mb-2">Buyer Dashboard</h1>
          <p className="text-gray-400">Track your bids, watchlist, and property activity</p>
        </div>

        {outbidAlerts.length > 0 && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Bell className="w-6 h-6 text-red-400" />
              <div>
                <div className="font-semibold text-red-400">You have been outbid!</div>
                <div className="text-sm text-gray-300">{outbidAlerts.length} properties need your attention</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-8 h-8 text-sky-400" />
              <div className="text-3xl font-bold">{myBids.length}</div>
            </div>
            <div className="text-sm text-gray-400">Active Bids</div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Eye className="w-8 h-8 text-sky-400" />
              <div className="text-3xl font-bold">{watchlist.length}</div>
            </div>
            <div className="text-sm text-gray-400">Watching</div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <div className="text-3xl font-bold">{wonAuctions.length}</div>
            </div>
            <div className="text-sm text-gray-400">Won Auctions</div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-8 h-8 text-sky-400" />
              <div className="text-3xl font-bold">{showings.length}</div>
            </div>
            <div className="text-sm text-gray-400">Upcoming Showings</div>
          </div>
        </div>

        <div className="border-b border-zinc-800 mb-6">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab("bids")}
              className={cn(
                "pb-4 px-2 border-b-2 transition-colors",
                activeTab === "bids"
                  ? "border-sky-400 text-sky-400"
                  : "border-transparent text-gray-400 hover:text-white"
              )}
            >
              My Bids
            </button>
            <button
              onClick={() => setActiveTab("watchlist")}
              className={cn(
                "pb-4 px-2 border-b-2 transition-colors",
                activeTab === "watchlist"
                  ? "border-sky-400 text-sky-400"
                  : "border-transparent text-gray-400 hover:text-white"
              )}
            >
              Watchlist
            </button>
            <button
              onClick={() => setActiveTab("won")}
              className={cn(
                "pb-4 px-2 border-b-2 transition-colors",
                activeTab === "won"
                  ? "border-sky-400 text-sky-400"
                  : "border-transparent text-gray-400 hover:text-white"
              )}
            >
              Won Auctions
            </button>
            <button
              onClick={() => setActiveTab("showings")}
              className={cn(
                "pb-4 px-2 border-b-2 transition-colors",
                activeTab === "showings"
                  ? "border-sky-400 text-sky-400"
                  : "border-transparent text-gray-400 hover:text-white"
              )}
            >
              Showings
            </button>
          </div>
        </div>

        {activeTab === "bids" && (
          <div className="space-y-4">
            {myBids.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>No active bids yet</p>
              </div>
            ) : (
              myBids.map((bid) => (
                <div
                  key={bid.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-sky-400/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/property/${bid.property.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Home className="w-5 h-5 text-sky-400" />
                        <h3 className="text-xl font-semibold">{bid.property.address}</h3>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className={cn("flex items-center gap-1", getStatusColor(bid.status))}>
                          {getStatusIcon(bid.status)}
                          <span className="text-sm font-medium uppercase">{bid.status}</span>
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-400">Your Bid</div>
                          <div className="font-semibold text-sky-400">{formatCurrency(bid.amount)}</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Current High</div>
                          <div className="font-semibold">{formatCurrency(bid.property.current_bid || bid.property.starting_bid)}</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Submitted</div>
                          <div>{formatDate(bid.created_at)}</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Auction Ends</div>
                          <div>{formatDate(bid.property.auction_end)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "watchlist" && (
          <div className="space-y-4">
            {watchlist.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Eye className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>No properties in your watchlist</p>
              </div>
            ) : (
              watchlist.map((item) => (
                <div
                  key={item.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-sky-400/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => navigate(`/property/${item.property.id}`)}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <Home className="w-5 h-5 text-sky-400" />
                        <h3 className="text-xl font-semibold">{item.property.address}</h3>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-gray-400">Current Bid</div>
                          <div className="font-semibold text-sky-400">
                            {formatCurrency(item.property.current_bid || item.property.starting_bid)}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-400">Added</div>
                          <div>{formatDate(item.created_at)}</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Auction Ends</div>
                          <div>{formatDate(item.property.auction_end)}</div>
                        </div>
                      </div>
                    </div>