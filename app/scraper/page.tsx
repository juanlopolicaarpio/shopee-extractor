'use client';

import { useState } from 'react';

export default function LazadaScraperPage() {
  const [urls, setUrls] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const addUrlInput = () => {
    setUrls([...urls, '']);
  };

  const removeUrlInput = (index: number) => {
    const newUrls = urls.filter((_, i) => i !== index);
    setUrls(newUrls.length === 0 ? [''] : newUrls);
  };

  const updateUrlInput = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const handleScrape = async (format: 'excel' | 'csv' | 'json') => {
    setLoading(true);
    setError('');
    setStats(null);

    try {
      const validUrls = urls.filter(url => url.trim() !== '');

      if (validUrls.length === 0) {
        setError('Please provide at least one Lazada shop/brand URL');
        setLoading(false);
        return;
      }

      const invalidUrls = validUrls.filter(url => !url.includes('lazada.com'));
      if (invalidUrls.length > 0) {
        setError('All URLs must be from Lazada.com');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/scrape-lazada', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls: validUrls,
          format: format
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to scrape products');
      }

      const totalProducts = response.headers.get('X-Total-Products');

      setStats({
        totalProducts,
        totalUrls: validUrls.length
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lazada_scraped.${format === 'excel' ? 'xlsx' : format}`;
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
              🏪 Lazada Shop Scraper
            </h1>
            <p className="text-gray-600">
              Extract all products from Lazada shop/brand pages automatically
            </p>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>Supported URLs:</strong> Lazada shop pages and brand store pages (e.g., cetaphil, lazmall stores)
                </p>
              </div>
            </div>
          </div>

          {/* URL Inputs */}
          <div className="space-y-4 mb-6">
            {urls.map((url, index) => (
              <div key={index} className="relative">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Lazada Shop URL {index + 1} {urls.length > 1 && `(${index + 1}/${urls.length})`}
                  </label>
                  {urls.length > 1 && (
                    <button
                      onClick={() => removeUrlInput(index)}
                      className="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      ✕ Remove
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => updateUrlInput(index, e.target.value)}
                  placeholder="https://www.lazada.com.ph/cetaphil/?q=All-Products&from=wangpu..."
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            ))}
          </div>

          {/* Add More Button */}
          <button
            onClick={addUrlInput}
            className="mb-6 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors font-medium"
          >
            ➕ Add Another URL
          </button>

          {/* Action Buttons */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => handleScrape('excel')}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? '⏳ Scraping...' : '📊 Download Excel'}
            </button>
            <button
              onClick={() => handleScrape('csv')}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? '⏳ Scraping...' : '📄 Download CSV'}
            </button>
            <button
              onClick={() => handleScrape('json')}
              disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? '⏳ Scraping...' : '📋 Download JSON'}
            </button>
          </div>

          {/* Loading Progress */}
          {loading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                <div>
                  <div className="font-semibold text-blue-800">Scraping in progress...</div>
                  <div className="text-sm text-blue-600">Loading all products from the shop. This may take 2-5 minutes.</div>
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-green-800 mb-2">✅ Success!</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">URLs Scraped</div>
                  <div className="text-2xl font-bold text-green-700">{stats.totalUrls}</div>
                </div>
                <div>
                  <div className="text-gray-600">Products Extracted</div>
                  <div className="text-2xl font-bold text-green-700">{stats.totalProducts}</div>
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
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-800 mb-4 text-lg">📖 How to Use</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Step 1: Copy Shop/Brand URL</p>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-2">
                  <li>Go to a Lazada shop or brand page</li>
                  <li>Example: <code className="bg-gray-200 px-1 py-0.5 rounded text-xs">lazada.com.ph/cetaphil/?q=All-Products</code></li>
                  <li>Copy the full URL from your browser</li>
                </ul>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Step 2: Paste URL Above</p>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-2">
                  <li>Paste the URL in the input field</li>
                  <li>Add multiple URLs to scrape multiple shops at once</li>
                  <li>The scraper will automatically load ALL products from each shop</li>
                </ul>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Step 3: Download</p>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-2">
                  <li>Click your preferred format (Excel, CSV, or JSON)</li>
                  <li>Wait for scraping to complete (usually 2-5 minutes)</li>
                  <li>File will download automatically with all product data</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-4">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Important Notes:</strong>
                </p>
                <ul className="list-disc list-inside text-sm text-yellow-700 mt-2 space-y-1 ml-2">
                  <li>Scraping takes time - be patient and don't refresh the page</li>
                  <li>The scraper loads ALL products, not just the first page</li>
                  <li>Includes: name, price, discount, rating, sold count, shop info, etc.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}