const content = `import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Octokit } from 'octokit';
import MyComponent from '../components/MyComponent';
import { Something } from './Something';`;
const importRegex = /(?:import|require|from|include)\s+[^'"]*?['"]([^'"]+)['"]/g;
let match;
while ((match = importRegex.exec(content)) !== null) {
    console.log(match[1]);
}
