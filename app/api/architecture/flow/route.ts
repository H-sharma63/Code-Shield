import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const graphPath = path.join(process.cwd(), 'graphify-out', 'graph.json');
    
    if (!fs.existsSync(graphPath)) {
      return NextResponse.json({ error: 'Graph data not generated yet' }, { status: 404 });
    }

    const fileContent = fs.readFileSync(graphPath, 'utf-8');
    const data = JSON.parse(fileContent);

    return NextResponse.json(data);
  } catch (error) {
    console.error('[API_FLOW_ERROR]', error);
    return NextResponse.json({ error: 'Failed to read graph data' }, { status: 500 });
  }
}
