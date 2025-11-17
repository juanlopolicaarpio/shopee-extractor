import { NextRequest, NextResponse } from 'next/server';
import { processMultipleJsons } from '@/lib/extractProducts';
import { generateExcel, generateCSV, generateJSON } from '@/lib/exportFiles';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jsonStrings, format } = body;

    if (!jsonStrings || !Array.isArray(jsonStrings) || jsonStrings.length === 0) {
      return NextResponse.json(
        { error: 'Please provide an array of JSON strings' },
        { status: 400 }
      );
    }

    // Process all JSONs
    const result = processMultipleJsons(jsonStrings);

    if (result.products.length === 0) {
      return NextResponse.json(
        { 
          error: 'No products found',
          details: result.stats.errors 
        },
        { status: 400 }
      );
    }

    // Generate file based on format
    let fileContent: Buffer | string;
    let contentType: string;
    let filename: string;

    switch (format) {
      case 'excel':
        fileContent = generateExcel(result.products);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = 'products.xlsx';
        break;
      
      case 'csv':
        fileContent = generateCSV(result.products);
        contentType = 'text/csv';
        filename = 'products.csv';
        break;
      
      case 'json':
      default:
        fileContent = generateJSON(result.products);
        contentType = 'application/json';
        filename = 'products.json';
        break;
    }

    // Return file for download
    return new NextResponse(fileContent, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Total-Products': result.stats.totalProducts.toString(),
        'X-Sold-Out': result.stats.soldOut.toString(),
        'X-Available': result.stats.available.toString(),
        'X-Total-Files': result.stats.totalFiles.toString()
      }
    });

  } catch (error) {
    console.error('Extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to process data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
