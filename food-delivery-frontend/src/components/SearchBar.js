import React, { useState } from 'react';

const SearchBar = ({ onSearch, placeholder = 'Search restaurants or cuisines...', initialValue = '' }) => {
  const [query, setQuery] = useState(initialValue);

  React.useEffect(() => {
    if (initialValue) setQuery(initialValue);
  }, [initialValue]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex bg-white rounded-xl shadow-xl overflow-hidden border border-white/20">
        <div className="flex items-center pl-5 text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-4 py-3.5 text-gray-800 placeholder-gray-400 focus:outline-none text-base"
        />
        <button type="submit" className="px-6 py-3.5 bg-primary-500 text-white font-semibold hover:bg-primary-600 transition-colors text-sm">
          Search
        </button>
      </div>
    </form>
  );
};

export default SearchBar;
