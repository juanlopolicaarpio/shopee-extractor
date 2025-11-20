'use client';

import { useState } from 'react';

type Platform = 'shopee' | 'lazada';

export default function Home() {
  const [platform, setPlatform] = useState<Platform>('shopee');
  
  // Shopee state
  const [jsonInputs, setJsonInputs] = useState<string[]>(['']);
  const [shopeeLoading, setShopeeLoading] = useState(false);
  const [shopeeStats, setShopeeStats] = useState<any>(null);
  const [shopeeError, setShopeeError] = useState<string>('');
  
  // Lazada state
  const [urls, setUrls] = useState<string[]>(['']);
  const [lazadaLoading, setLazadaLoading] = useState(false);
  const [lazadaStats, setLazadaStats] = useState<any>(null);
  const [lazadaError, setLazadaError] = useState<string>('');

  // Shopee functions
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

  const handleShopeeExtract = async (format: 'excel' | 'csv' | 'json') => {
    setShopeeLoading(true);
    setShopeeError('');
    setShopeeStats(null);

    try {
      const validJsons = jsonInputs.filter(json => json.trim() !== '');

      if (validJsons.length === 0) {
        setShopeeError('Please paste at least one JSON');
        setShopeeLoading(false);
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

      const totalProducts = response.headers.get('X-Total-Products');
      const soldOut = response.headers.get('X-Sold-Out');
      const available = response.headers.get('X-Available');
      const totalFiles = response.headers.get('X-Total-Files');

      setShopeeStats({
        totalProducts,
        soldOut,
        available,
        totalFiles
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shopee_products.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (err) {
      setShopeeError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setShopeeLoading(false);
    }
  };

  // Lazada functions
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

  const handleLazadaScrape = async (format: 'excel' | 'csv' | 'json') => {
    setLazadaLoading(true);
    setLazadaError('');
    setLazadaStats(null);

    try {
      const validUrls = urls.filter(url => url.trim() !== '');

      if (validUrls.length === 0) {
        setLazadaError('Please provide at least one Lazada shop/brand URL');
        setLazadaLoading(false);
        return;
      }

      const invalidUrls = validUrls.filter(url => !url.includes('lazada.com'));
      if (invalidUrls.length > 0) {
        setLazadaError('All URLs must be from Lazada.com');
        setLazadaLoading(false);
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

      setLazadaStats({
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
      setLazadaError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLazadaLoading(false);
    }
  };

  const changePlatform = (newPlatform: Platform) => {
    setPlatform(newPlatform);
    setJsonInputs(['']);
    setUrls(['']);
    setShopeeStats(null);
    setShopeeError('');
    setLazadaStats(null);
    setLazadaError('');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              {platform === 'shopee' ? '🛍️' : '🏪'} E-Commerce Product Extractor
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

          {/* SHOPEE CONTENT */}
          {platform === 'shopee' && (
            <>
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
                          className="text-red-500 hover:text-red-700 text-sm font-medium"
                        >
                          ✕ Remove
                        </button>
                      )}
                    </div>
                    <textarea
                      value={json}
                      onChange={(e) => updateJsonInput(index, e.target.value)}
                      placeholder='{"data": {"sections": [...]}}'
                      className="w-full h-48 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                ))}
              </div>

              {/* Add More Button */}
              <button
                onClick={addJsonInput}
                className="mb-6 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors font-medium"
              >
                ➕ Add Another JSON (for Page 2, 3, etc.)
              </button>

              {/* Action Buttons */}
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => handleShopeeExtract('excel')}
                  disabled={shopeeLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  {shopeeLoading ? '⏳ Processing...' : '📊 Download Excel'}
                </button>
                <button
                  onClick={() => handleShopeeExtract('csv')}
                  disabled={shopeeLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  {shopeeLoading ? '⏳ Processing...' : '📄 Download CSV'}
                </button>
                <button
                  onClick={() => handleShopeeExtract('json')}
                  disabled={shopeeLoading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  {shopeeLoading ? '⏳ Processing...' : '📋 Download JSON'}
                </button>
              </div>

              {/* Stats */}
              {shopeeStats && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-green-800 mb-2">✅ Success!</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Files Processed</div>
                      <div className="text-2xl font-bold text-green-700">{shopeeStats.totalFiles}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Total Products</div>
                      <div className="text-2xl font-bold text-green-700">{shopeeStats.totalProducts}</div>
                    </div>
                    {shopeeStats.available && (
                      <div>
                        <div className="text-gray-600">Available</div>
                        <div className="text-2xl font-bold text-blue-700">{shopeeStats.available}</div>
                      </div>
                    )}
                    {shopeeStats.soldOut && (
                      <div>
                        <div className="text-gray-600">Sold Out</div>
                        <div className="text-2xl font-bold text-orange-700">{shopeeStats.soldOut}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error */}
              {shopeeError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-red-800 mb-1">❌ Error</h3>
                  <p className="text-red-700 text-sm">{shopeeError}</p>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-800 mb-4 text-lg">📖 How to Extract Shopee Products</h3>
                
                <div className="space-y-3">
                  <div className="bg-orange-50 border-l-4 border-orange-500 p-3 mb-4">
                    <p className="text-sm text-orange-800">
                      <strong>💡 Tip:</strong> Go to "All Products" section for best results!
                    </p>
                  </div>

                  <ol className="list-decimal list-inside text-sm text-gray-700 space-y-2 ml-2">
                    <li className="font-semibold">Open Shopee and go to "All Products"</li>
                    <li>Right-click anywhere on the page and select <strong>"Inspect"</strong></li>
                    <li>This opens <strong>Developer Tools</strong></li>
                    <li>Click on the <strong>"Network"</strong> tab at the top</li>
                    <li>Press <kbd className="bg-gray-200 px-2 py-1 rounded">Ctrl+R</kbd> (or click the refresh button) to reload the page</li>
                    <li>In the filter box at the top, type: <code className="bg-gray-200 px-2 py-1 rounded text-xs">rcmd</code></li>
                    <li>Click on the <strong>"rcmd_items"</strong> request that appears in the list</li>
                    <li>Click the <strong>"Response"</strong> tab on the right side</li>
                    <li>Press <kbd className="bg-gray-200 px-2 py-1 rounded">Ctrl+A</kbd> to select all, then <kbd className="bg-gray-200 px-2 py-1 rounded">Ctrl+C</kbd> to copy</li>
                    <li>Paste the JSON in the text box above</li>
                    <li className="font-semibold text-orange-700 mt-3">For multiple pages (page 2, 3, etc.):</li>
                    <li className="ml-6">Click the page number button (2, 3, etc.) on Shopee</li>
                    <li className="ml-6">Click "➕ Add Another JSON" button above</li>
                    <li className="ml-6">Find the new "rcmd_items" request in the Network tab and copy its response</li>
                    <li className="ml-6">Paste in the new JSON box</li>
                    <li className="ml-6">Repeat for all pages you want</li>
                    <li className="font-semibold">When done, click Download Excel/CSV/JSON! 🎉</li>
                  </ol>
                </div>
              </div>
            </>
          )}

          {/* LAZADA CONTENT */}
          {platform === 'lazada' && (
            <>
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
                  onClick={() => handleLazadaScrape('excel')}
                  disabled={lazadaLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  {lazadaLoading ? '⏳ Scraping...' : '📊 Download Excel'}
                </button>
                <button
                  onClick={() => handleLazadaScrape('csv')}
                  disabled={lazadaLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  {lazadaLoading ? '⏳ Scraping...' : '📄 Download CSV'}
                </button>
                <button
                  onClick={() => handleLazadaScrape('json')}
                  disabled={lazadaLoading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  {lazadaLoading ? '⏳ Scraping...' : '📋 Download JSON'}
                </button>
              </div>

              {/* Loading Progress */}
              {lazadaLoading && (
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
              {lazadaStats && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-green-800 mb-2">✅ Success!</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">URLs Scraped</div>
                      <div className="text-2xl font-bold text-green-700">{lazadaStats.totalUrls}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Products Extracted</div>
                      <div className="text-2xl font-bold text-green-700">{lazadaStats.totalProducts}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {lazadaError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-red-800 mb-1">❌ Error</h3>
                  <p className="text-red-700 text-sm">{lazadaError}</p>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-800 mb-4 text-lg">📖 How to Use Lazada Scraper</h3>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Step 1: Copy Shop/Brand URL</p>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-2">
                      <li>Go to a Lazada shop or brand page</li>
                      <li><strong>Select the "All Products" section</strong> on the shop page</li>
                      <li>Copy the full URL from your browser address bar</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Step 2: Paste URL Above</p>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-2">
                      <li>Paste the URL in the input field</li>
                      <li>The scraper will automatically load ALL products from that page</li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 border-l-4 border-blue-500 p-3">
                    <p className="text-sm font-semibold text-blue-800 mb-2">📄 For Multiple Pages (Page 2, 3, etc.):</p>
                    <ul className="list-disc list-inside text-sm text-blue-700 space-y-1 ml-2">
                      <li>Lazada has page number buttons (1, 2, 3, etc.) at the bottom</li>
                      <li>Click page number 2, 3, etc. on Lazada</li>
                      <li>Copy the new URL from your browser</li>
                      <li>Click "➕ Add Another URL" button above</li>
                      <li>Paste the new page URL</li>
                      <li>Repeat for all pages you want to extract</li>
                      <li>The scraper will load ALL products from each page URL</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Step 3: Download</p>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-2">
                      <li>Click your preferred format (Excel, CSV, or JSON)</li>
                      <li>Wait for scraping to complete (usually 2-5 minutes per URL)</li>
                      <li>File will download automatically with all product data</li>
                    </ul>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-4">
                    <p className="text-sm text-yellow-800">
                      <strong>⚠️ Important Notes:</strong>
                    </p>
                    <ul className="list-disc list-inside text-sm text-yellow-700 mt-2 space-y-1 ml-2">
                      <li>Scraping takes time - be patient and don't refresh the page</li>
                      <li>Each URL can take 2-5 minutes to scrape completely</li>
                      <li>Multiple URLs = longer wait time (but worth it!)</li>
                      <li>The scraper loads ALL products from each URL automatically</li>
                      <li>Includes: name, price, discount, rating, sold count, shop info, etc.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}