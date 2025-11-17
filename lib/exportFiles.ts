import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Product } from '@/types/product';

// 🔹 Helper: parse/format monthly sold
function getMonthlySoldInfo(monthlySold: string): {
  numeric: number;   // numeric used for computation (e.g. 3000)
  adjusted: number;  // numeric after +500 rule (e.g. 3500)
  display: string;   // display for "Monthly Sold (numeric)" column (e.g. "3k")
} {
  if (!monthlySold) {
    return { numeric: 0, adjusted: 0, display: '0' };
  }

  // Lowercase and trim
  let raw = monthlySold.toString().toLowerCase().trim();

  // Remove trailing "+" and commas
  raw = raw.replace(/\+/g, '').replace(/,/g, '');

  // Remove words like "sold", "sold/month", etc.
  raw = raw.replace(/sold\/month|sold\/mo|sold per month|sold monthly|sold/g, '');
  raw = raw.trim();

  // Remove leftover spaces
  raw = raw.replace(/\s+/g, '');

  // At this point, examples:
  // "3k"        -> "3k"
  // "3k+"       -> "3k"
  // "3k sold"   -> "3k"
  // "568"       -> "568"

  // Match "Xk" or "X.Yk"
  const kMatch = raw.match(/^(\d+(\.\d+)?)k$/);
  if (kMatch) {
    const base = parseFloat(kMatch[1]); // "3" -> 3, "3.5" -> 3.5
    if (isNaN(base)) {
      return { numeric: 0, adjusted: 0, display: monthlySold };
    }

    const numeric = base * 1000; // 3k -> 3000
    // Only add 500 to k-values (1k–10k rule)
    const shouldAdd500 = base >= 1 && base <= 10;
    const adjusted = shouldAdd500 ? numeric + 500 : numeric;

    // Display as e.g. "3k" or "3.5k"
    const display =
      Number.isInteger(base) ? `${base.toFixed(0)}k` : `${base}k`;

    return { numeric, adjusted, display };
  }

  // Not a k-value: plain number like "568" etc. → NO +500
  const numericRaw = parseFloat(raw);
  if (isNaN(numericRaw)) {
    // fallback: just return 0 but keep original string for display
    return { numeric: 0, adjusted: 0, display: monthlySold };
  }

  const numeric = numericRaw;
  const adjusted = numeric; // no +500
  const display = numeric.toString(); // "568"

  return { numeric, adjusted, display };
}

// 🔹 Helper: get numeric price
function getPriceNumeric(p: Product): number {
  if (typeof p.price_numeric === 'number' && !isNaN(p.price_numeric)) {
    return p.price_numeric;
  }
  const parsed = parseFloat(p.price.toString().replace(/,/g, ''));
  return isNaN(parsed) ? 0 : parsed;
}

export function generateExcel(products: Product[]): Buffer {
  const rows = products.map(p => {
    const { numeric: monthlySoldNum, adjusted: adjustedMonthlySold } =
      getMonthlySoldInfo(p.monthly_sold);
    const price = getPriceNumeric(p);
    const monthlySoldSales = price * adjustedMonthlySold;

    // store computed fields on the object (for JSON/CSV)
    p.monthly_sold_numeric = monthlySoldNum;
    p.adjusted_monthly_sold = adjustedMonthlySold;
    p.monthly_sold_sales = monthlySoldSales;

    return {
      'Product Name': p.name,
      'Price': price,
      'Original Price': p.original_price || '',
      'Discount': p.discount || '',
      'Total Sold': p.historical_sold,
      // Products sheet shows raw monthly sold only:
      'Monthly Sold': p.monthly_sold,
      'Monthly Sold Sales': monthlySoldSales,
      'Rating': p.rating,
      'Item ID': p.item_id,
      'Shop Name': p.shop_name,
      'Sold Out': p.sold_out,
      'Status': p.status
    };
  });

  // ========= Sheet 1: Products =========
  const worksheet = XLSX.utils.json_to_sheet(rows);

  const maxWidth = 50;
  const nameColWidth = Math.min(
    maxWidth,
    Math.max(12, ...products.map(p => (p.name ? p.name.length : 12)))
  );

  const columnWidths = [
    { wch: nameColWidth }, // Product Name
    { wch: 12 },           // Price
    { wch: 15 },           // Original Price
    { wch: 10 },           // Discount
    { wch: 12 },           // Total Sold
    { wch: 18 },           // Monthly Sold (raw)
    { wch: 20 },           // Monthly Sold Sales
    { wch: 8 },            // Rating
    { wch: 12 },           // Item ID
    { wch: 20 },           // Shop Name
    { wch: 10 },           // Sold Out
    { wch: 10 }            // Status
  ];

  worksheet['!cols'] = columnWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

  // ========= Sheet 2: Product Total Sales =========
// Define flexible row type
type TotalSalesRow = {
  'Product Name': string;
  'Price': number | string;
  'Monthly Sold (numeric)': string;
  'Adjusted Monthly Sold (+500)': number | string;
  'Monthly Sold Sales': number | string;
};

// Convert rows using the flexible type
const totalSalesRows: TotalSalesRow[] = products.map(p => {
  const { numeric: monthlySoldNum, adjusted: adjustedMonthlySold, display } =
    getMonthlySoldInfo(p.monthly_sold);
  const price = getPriceNumeric(p);
  const monthlySoldSales = price * adjustedMonthlySold;

  return {
    'Product Name': p.name,
    'Price': price,
    'Monthly Sold (numeric)': display,
    'Adjusted Monthly Sold (+500)': adjustedMonthlySold,
    'Monthly Sold Sales': monthlySoldSales
  };
});

// Compute total
const grandTotalMonthlySales = totalSalesRows.reduce((sum, row) => {
  const val = Number(row['Monthly Sold Sales']);
  return sum + (isNaN(val) ? 0 : val);
}, 0);

// Push TOTAL row with safe typing
totalSalesRows.push({
  'Product Name': 'TOTAL',
  'Price': '',
  'Monthly Sold (numeric)': '',
  'Adjusted Monthly Sold (+500)': '',
  'Monthly Sold Sales': grandTotalMonthlySales
});
  const totalSalesSheet = XLSX.utils.json_to_sheet(totalSalesRows);

  totalSalesSheet['!cols'] = [
    { wch: nameColWidth }, // Product Name
    { wch: 12 },           // Price
    { wch: 22 },           // Monthly Sold (numeric)
    { wch: 26 },           // Adjusted Monthly Sold (+500)
    { wch: 22 }            // Monthly Sold Sales
  ];

  XLSX.utils.book_append_sheet(workbook, totalSalesSheet, 'Product Total Sales');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}

export function generateCSV(products: Product[]): string {
  const data = products.map(p => {
    const { numeric: monthlySoldNum, adjusted: adjustedMonthlySold } =
      getMonthlySoldInfo(p.monthly_sold);
    const price = getPriceNumeric(p);
    const monthlySoldSales = price * adjustedMonthlySold;

    p.monthly_sold_numeric = monthlySoldNum;
    p.adjusted_monthly_sold = adjustedMonthlySold;
    p.monthly_sold_sales = monthlySoldSales;

    return {
      'Product Name': p.name,
      'Price': price,
      'Original Price': p.original_price || '',
      'Discount': p.discount || '',
      'Total Sold': p.historical_sold,
      'Monthly Sold (raw)': p.monthly_sold,
      'Monthly Sold (numeric)': monthlySoldNum,
      'Adjusted Monthly Sold (+500)': adjustedMonthlySold,
      'Monthly Sold Sales': monthlySoldSales,
      'Rating': p.rating,
      'Item ID': p.item_id,
      'Shop Name': p.shop_name,
      'Sold Out': p.sold_out,
      'Status': p.status
    };
  });

  return Papa.unparse(data);
}

export function generateJSON(products: Product[]): string {
  const enriched = products.map(p => {
    const { numeric: monthlySoldNum, adjusted: adjustedMonthlySold } =
      getMonthlySoldInfo(p.monthly_sold);
    const price = getPriceNumeric(p);
    const monthlySoldSales = price * adjustedMonthlySold;

    return {
      ...p,
      monthly_sold_numeric: monthlySoldNum,
      adjusted_monthly_sold: adjustedMonthlySold,
      monthly_sold_sales: monthlySoldSales
    };
  });

  return JSON.stringify(enriched, null, 2);
}
