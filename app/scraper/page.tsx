'use client';

import { useState } from 'react';

type ScraperType = 'product' | 'search' | 'category';

export default function LazadaScraperPage() {
  const [urls, setUrls] = useState<string[]>(['']);
  const [scraperType, setScraperType] = useState<ScraperType>('category');
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
      // Filter out empty URLs
      const validUrls = urls.filter(url => url.trim() !== '');

      if (validUrls.length === 0) {
        setError('Please provide at least one Lazada URL');
        setLoading(false);
        return;
      }

      // Validate URLs
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
          type: scraperType,
          format: format
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to scrape products');
      }

      // Get stats from headers
      const totalProducts = response.headers.get('X-Total-Products');

      setStats({
        totalProducts,
        totalUrls: validUrls.length
      });

      // Download file
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
              🏪 Lazada Automated Scraper
            </h1>
            <p className="text-gray-600">
              Enter Lazada URLs and automatically scrape product data
            </p>
          </div>

          {/* Scraper Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scraping Mode
            </label>
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => setScraperType('product')}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  scraperType === 'product'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">📦</div>
                <div className="font-semibold">Single Product</div>
                <div className="text-xs text-gray-500">Product detail page</div>
              </button>

              <button
                onClick={() => setScraperType('search')}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  scraperType === 'search'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">🔍</div>
                <div className="font-semibold">Search Results</div>
                <div className="text-xs text-gray-500">Multiple products</div>
              </button>

              <button
                onClick={() => setScraperType('category')}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  scraperType === 'category'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">📁</div>
                <div className="font-semibold">Category Page</div>
                <div className="text-xs text-gray-500">Multiple products</div>
              </button>
            </div>
          </div>

          {/* URL Inputs */}
          <div className="space-y-4 mb-6">
            {urls.map((url, index) => (
              <div key={index} className="relative">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Lazada URL {index + 1} {urls.length > 1 && `(${index + 1}/${urls.length})`}
                  </label>
                  {urls.length > 1 && (
                    <button
                      onClick={() => removeUrlInput(index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      ✕ Remove
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => updateUrlInput(index, e.target.value)}
                  placeholder={
                    scraperType === 'product'
                      ? 'https://www.lazada.com.ph/products/...'
                      : 'https://www.lazada.com.ph/tag/... or /catalog/?q=...'
                  }
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            ))}
          </div>

          {/* Add More Button */}
          <button
            onClick={addUrlInput}
            className="mb-6 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
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
                  <div className="text-sm text-blue-600">This may take a few minutes depending on the number of products</div>
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
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2">📖 How to Use</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Step 1: Choose Scraping Mode</p>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li><strong>Single Product:</strong> Extract one product at a time</li>
                  <li><strong>Search Results:</strong> Extract all products from search pages</li>
                  <li><strong>Category Page:</strong> Extract all products from category pages</li>
                </ul>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Step 2: Add Lazada URLs</p>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li>Copy URLs directly from Lazada.com.ph</li>
                  <li>Example: https://www.lazada.com.ph/tag/lazmall-official-store-cetaphil/</li>
                  <li>Add multiple URLs to scrape more products</li>
                </ul>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Step 3: Download</p>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li>Click your preferred format (Excel, CSV, or JSON)</li>
                  <li>Wait for scraping to complete (may take 1-5 minutes)</li>
                  <li>File will download automatically</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-4">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Note:</strong> Scraping may be slower than JSON extraction. Be patient and don't refresh the page while scraping.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}