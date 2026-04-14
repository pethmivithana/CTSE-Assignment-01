import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import RestaurantCard from '../components/RestaurantCard';
import { api } from '../services/api';

const SORT_OPTIONS = [
  { value: 'rating_desc', label: 'Highest rated' },
  { value: 'rating_asc', label: 'Lowest rated' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'name_desc', label: 'Name Z–A' },
];

const RestaurantPage = () => {
  const { state } = useLocation();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: state?.searchQuery || '',
    cuisine: 'all',
    city: '',
    openNow: '',
    sort: 'rating_desc',
  });

  const categories = [...new Set(restaurants.map((r) => r.cuisineType).filter(Boolean))].sort();
  const cities = [...new Set(restaurants.map((r) => r.location?.city).filter(Boolean))].sort();

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (filters.cuisine && filters.cuisine !== 'all') params.cuisineType = filters.cuisine;
      if (filters.city?.trim()) params.city = filters.city.trim();
      if (filters.openNow === 'true') params.isOpen = true;
      if (filters.sort) params.sort = filters.sort;
      if (filters.search?.trim()) params.search = filters.search.trim();
      const data = await api.getRestaurants(params);
      const list = Array.isArray(data) ? data : data.data || [];
      setRestaurants(list);
    } catch (err) {
      setError(err.message);
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, [filters.cuisine, filters.city, filters.openNow, filters.sort, filters.search, fetchRestaurants]);

  useEffect(() => {
    const q = state?.searchQuery?.toLowerCase();
    if (q) setFilters((f) => ({ ...f, search: q }));
  }, [state?.searchQuery]);

  const handleSearch = (query) => {
    setFilters((f) => ({ ...f, search: query }));
  };

  const displayRestaurants = restaurants;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-800 mb-2">Discover Restaurants</h1>
      <p className="text-gray-500 mb-8">Find your next meal from top-rated local restaurants</p>

      <div className="mb-8">
        <SearchBar
          onSearch={handleSearch}
          placeholder="Search by name, cuisine, or location..."
          initialValue={filters.search || state?.searchQuery}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium text-gray-600">Filters:</span>
          <select
            value={filters.cuisine}
            onChange={(e) => setFilters((f) => ({ ...f, cuisine: e.target.value }))}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 bg-white hover:border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All cuisines</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={filters.city}
            onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 bg-white hover:border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">All locations</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white cursor-pointer hover:border-gray-300">
            <input
              type="checkbox"
              checked={filters.openNow === 'true'}
              onChange={(e) => setFilters((f) => ({ ...f, openNow: e.target.checked ? 'true' : '' }))}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-700">Open now</span>
          </label>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <span className="text-sm font-medium text-gray-600">Sort by:</span>
          <select
            value={filters.sort}
            onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 bg-white hover:border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card overflow-hidden animate-pulse">
              <div className="aspect-[4/3] bg-gray-200" />
              <div className="p-5 space-y-3">
                <div className="h-5 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : displayRestaurants.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayRestaurants.map((restaurant) => (
            <RestaurantCard key={restaurant._id} restaurant={restaurant} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 card">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">No restaurants found</p>
          <p className="text-sm text-gray-500 mt-1">
            {error ? 'Check back soon — restaurants will appear once they join Feedo.' : 'Try adjusting your filters or search term.'}
          </p>
          {error && (
            <button onClick={() => { setError(null); fetchRestaurants(); }} className="mt-4 btn-secondary">
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default RestaurantPage;
