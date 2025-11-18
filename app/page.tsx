'use client';

import { useState } from 'react';

type Platform = 'shopee' | 'lazada';

export default function Home() {
  const [platform, setPlatform] = useState<Platform>('shopee');
  const [jsonInputs, setJsonInputs] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const addJsonInput = () => {
    setJsonInputs([...jsonInputs, '']);
  };

  const removeJsonInput = (index: number) => {
    const newInputs = jsonInputs.filter((_, i) => i !== index);
    setJsonInputs(newInputs.length === 0 ? [''] : newInputs);
  };

  const updateJsonInput = (index: number, value: string) => {
    const newInputs = [...jsonInputs];
    newInputs[index] = value;
    setJsonInputs(newInputs);
  };

  const changePlatform = (newPlatform: Platform) => {
    setPlatform(newPlatform);
    setJsonInputs(['']);
    setStats(null);
    setError('');
  };

  const handleExtract = async (format: 'excel' | 'csv' | 'json') => {
    setLoading(true);
    setError('');
    setStats(null);

    try {
      // Filter out empty inputs
      const validJsons = jsonInputs.filter(json => json.trim() !== '');

      if (validJsons.length === 0) {
        setError('Please paste at least one JSON');
        setLoading(false);
        return;
      }

      const endpoint = platform === 'shopee' ? '/api/extract' : '/api/extract-lazada';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonStrings: validJsons,
          format: format
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extract products');
      }

      // Get stats from headers
      const totalProducts = response.headers.get('X-Total-Products');
      const soldOut = response.headers.get('X-Sold-Out');
      const available = response.headers.get('X-Available');
      const totalFiles = response.headers.get('X-Total-Files');

      setStats({
        totalProducts,
        soldOut,
        available,
        totalFiles
      });

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const prefix = platform === 'shopee' ? 'shopee' : 'lazada';
      a.download = `${prefix}_products.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const platformConfig = {
    shopee: {
      name: 'Shopee',
      emoji: '🛍️',
      color: 'orange',
      placeholder: '{"centralize_item_card": {"item_cards": [...]}}'
    },
    lazada: {
      name: 'Lazada',
      emoji: '🏪',
      color: 'blue',
      placeholder: '{"mods": {"listItems": [...]}}'
    }
  };

  const config = platformConfig[platform];

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              {config.emoji} E-Commerce Product Extractor
            </h1>
            <p className="text-gray-600">
              Extract products from Shopee and Lazada to Excel, CSV, or JSON
            </p>
          </div>

          {/* Platform Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-200">
            <button
              onClick={() => changePlatform('shopee')}
              className={`px-6 py-3 font-semibold rounded-t-lg transition-colors ${
                platform === 'shopee'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              🛍️ Shopee
            </button>
            <button
              onClick={() => changePlatform('lazada')}
              className={`px-6 py-3 font-semibold rounded-t-lg transition-colors ${
                platform === 'lazada'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              🏪 Lazada
            </button>
          </div>

          {/* JSON Inputs */}
          <div className="space-y-4 mb-6">
            {jsonInputs.map((json, index) => (
              <div key={index} className="relative">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    JSON {index + 1} {jsonInputs.length > 1 && `(${index + 1}/${jsonInputs.length})`}
                  </label>
                  {jsonInputs.length > 1 && (
                    <button
                      onClick={() => removeJsonInput(index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      ✕ Remove
                    </button>
                  )}
                </div>
                <textarea
                  value={json}
                  onChange={(e) => updateJsonInput(index, e.target.value)}
                  placeholder={config.placeholder}
                  className="w-full h-48 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            ))}
          </div>

          {/* Add More Button */}
          <button
            onClick={addJsonInput}
            className="mb-6 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
          >
            ➕ Add Another JSON
          </button>

          {/* Action Buttons */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => handleExtract('excel')}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? '⏳ Processing...' : '📊 Download Excel'}
            </button>
            <button
              onClick={() => handleExtract('csv')}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? '⏳ Processing...' : '📄 Download CSV'}
            </button>
            <button
              onClick={() => handleExtract('json')}
              disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? '⏳ Processing...' : '📋 Download JSON'}
            </button>
          </div>

          {/* Stats */}
          {stats && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-green-800 mb-2">✅ Success!</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Files Processed</div>
                  <div className="text-2xl font-bold text-green-700">{stats.totalFiles}</div>
                </div>
                <div>
                  <div className="text-gray-600">Total Products</div>
                  <div className="text-2xl font-bold text-green-700">{stats.totalProducts}</div>
                </div>
                {stats.available && (
                  <div>
                    <div className="text-gray-600">Available</div>
                    <div className="text-2xl font-bold text-blue-700">{stats.available}</div>
                  </div>
                )}
                {stats.soldOut && (
                  <div>
                    <div className="text-gray-600">Sold Out</div>
                    <div className="text-2xl font-bold text-orange-700">{stats.soldOut}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-red-800 mb-1">❌ Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2">📖 Instructions</h3>
            
            {platform === 'shopee' ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700">How to get Shopee JSON:</p>
                <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                  <li>Open Shopee in your browser and search for products</li>
                  <li>Press F12 to open Developer Tools → Network tab</li>
                  <li>Scroll down to load products</li>
                  <li>Find request containing "search_items" in Network tab</li>
                  <li>Click it → Response tab → Copy the JSON</li>
                  <li>Paste the JSON above and click Download</li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700">How to get Lazada JSON:</p>
                <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                  <li>Open Lazada in your browser and search for products</li>
                  <li>Press F12 to open Developer Tools → Network tab</li>
                  <li>Filter by "Fetch/XHR"</li>
                  <li>Scroll down to load products</li>
                  <li>Find request containing "listItems" in the response</li>
                  <li>Click it → Response tab → Copy the JSON</li>
                  <li>Paste the JSON above and click Download</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}