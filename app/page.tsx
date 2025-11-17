'use client';

import { useState } from 'react';

export default function Home() {
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

      const response = await fetch('/api/extract', {
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
      a.download = `products.${format === 'excel' ? 'xlsx' : format}`;
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

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              🏪 Shopee Product Extractor
            </h1>
            <p className="text-gray-600">
              Paste your Shopee JSON data and extract products to Excel, CSV, or JSON
            </p>
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
                  placeholder='{"centralize_item_card": {"item_cards": [...]}}'
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
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Files Processed</div>
                  <div className="text-2xl font-bold text-green-700">{stats.totalFiles}</div>
                </div>
                <div>
                  <div className="text-gray-600">Total Products</div>
                  <div className="text-2xl font-bold text-green-700">{stats.totalProducts}</div>
                </div>
                <div>
                  <div className="text-gray-600">Available</div>
                  <div className="text-2xl font-bold text-blue-700">{stats.available}</div>
                </div>
                <div>
                  <div className="text-gray-600">Sold Out</div>
                  <div className="text-2xl font-bold text-orange-700">{stats.soldOut}</div>
                </div>
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
            <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
              <li>Paste your Shopee JSON data in the textareas above</li>
              <li>Click "Add Another JSON" if you have multiple files</li>
              <li>Click any download button to process and download</li>
              <li>Works with both JSON structures (with/without 'data' wrapper)</li>
              <li>Handles sold-out items automatically</li>
            </ol>
          </div>
        </div>
      </div>
    </main>
  );
}
