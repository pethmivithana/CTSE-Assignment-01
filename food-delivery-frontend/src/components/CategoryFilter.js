import React from 'react';

const CategoryFilter = ({ categories, selectedCategory, setSelectedCategory }) => {
  const normalized = (categories || []).map((c) =>
    typeof c === 'string' ? { name: c, description: '' } : { name: c.name, description: c.description || '' },
  );
  const selectedMeta = normalized.find((c) => c.name === selectedCategory);

  return (
    <div className="mb-8">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
            selectedCategory === 'all'
              ? 'bg-primary-500 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
          }`}
        >
          All
        </button>
        {normalized.map((category) => (
          <button
            key={category.name}
            onClick={() => setSelectedCategory(category.name)}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              selectedCategory === category.name
                ? 'bg-primary-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            }`}
            title={category.description || category.name}
          >
            {category.name}
          </button>
        ))}
      </div>
      {selectedCategory !== 'all' && selectedMeta?.description && (
        <p className="mt-2 text-sm text-gray-600">{selectedMeta.description}</p>
      )}
    </div>
  );
};

export default CategoryFilter;
