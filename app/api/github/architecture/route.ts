import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Octokit } from 'octokit';
import { callVertexAI } from '@/app/lib/ai/vertex-service';
import { ARCHITECTURE_SYSTEM_PROMPT, formatArchitectureContext } from '@/app/lib/ai/prompts/architecture-prompt';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as { accessToken?: string } | null;
    const { searchParams } = new URL(req.url);
    const repoFullName = searchParams.get('repo');

    if (!repoFullName) {
      return NextResponse.json({ message: 'Repository name is required' }, { status: 400 });
    }

    console.log(`[ARCHITECTURE_API] Start sniffer for: ${repoFullName}`);
    const [owner, repo] = repoFullName.split('/');
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN || session?.accessToken });

    console.log(`[ARCHITECTURE_API] Fetching repo info...`);
    const repoInfo = await octokit.rest.repos.get({ owner, repo });
    const defaultBranch = repoInfo.data.default_branch;

    console.log(`[ARCHITECTURE_API] Fetching tree recursive for ${defaultBranch}...`);
    const treeResponse = await octokit.rest.git.getTree({
      owner, repo, tree_sha: defaultBranch, recursive: '1',
    });
    const allTreeItems = treeResponse.data.tree;

    const itemsToSniff = allTreeItems.filter((item: any) => 
        item.type === 'blob' && /\.(ts|tsx|js|prisma)$/i.test(item.path) &&
        !item.path.includes('node_modules') && !item.path.includes('.next')
    ).slice(0, 80);

    console.log(`[ARCHITECTURE_API] Snorkeling ${itemsToSniff.length} files for context...`);
    const fileData: Record<string, string> = {};
    await Promise.all(itemsToSniff.map(async (item: any) => {
        try {
            const res = await octokit.rest.repos.getContent({ owner, repo, path: item.path, ref: defaultBranch });
            const data = res.data as any;
            if (data.content) fileData[item.path] = Buffer.from(data.content, 'base64').toString('utf-8');
        } catch (e) { 
            console.warn(`[ARCHITECTURE_API] Failed to fetch: ${item.path}`);
        }
    }));

    // --- STRUCTURED ARCHITECTURE ENGINE ---
    try {
        console.log(`[ARCHITECTURE_API] Preparing formatArchitectureContext...`);
        const context = formatArchitectureContext(allTreeItems, fileData);
        console.log(`[ARCHITECTURE_API] Context Size: ${context.length} chars. Submitting to AI...`);
        
        const aiResponse = await callVertexAI('google', 'gemini-2.0-flash-001', context, ARCHITECTURE_SYSTEM_PROMPT, 'json');
        console.log(`[ARCHITECTURE_API] AI response received. Length: ${aiResponse.length}`);

        const rawJsonStr = aiResponse.replace(/```json\n?/, '').replace(/\n?```/, '').trim();
        const data = JSON.parse(rawJsonStr);
        console.log(`[ARCHITECTURE_API] Successfully parsed JSON. Nodes: ${data.nodes.length}, Edges: ${data.edges.length}`);

        // DETERMINISTIC MERMAID GENERATOR (FAIL-SAFE)
        let mermaid = "flowchart TD\n";
        
        const categories = ["Public experience", "Authenticated app", "API layer", "Data layer", "Shared UI"];
        
        categories.forEach(cat => {
            const catNodes = data.nodes.filter((n: any) => n.category === cat);
            if (catNodes.length > 0) {
                const cleanCatId = cat.replace(/\s+/g, '_').toLowerCase();
                mermaid += `  subgraph ${cleanCatId} ["${cat}"]\n`;
                mermaid += `    direction LR\n`;
                catNodes.forEach((n: any) => {
                    const id = n.id.replace(/[^a-zA-Z0-9]/g, '_');
                    const label = n.label.replace(/"/g, "'");
                    let shape = `["${label}"]`;
                    if (n.shape === 'cylinder') shape = `[("${label}")]`;
                    if (n.shape === 'hex') shape = `{{\"${label}\"}}`;
                    if (n.shape === 'circle') shape = `(("${label}"))`;

                    mermaid += `    ${id}${shape}\n`;
                });
                mermaid += `  end\n\n`;
            }
        });

        // Edge sanitization
        data.edges.forEach((e: any) => {
            const s = e.source.replace(/[^a-zA-Z0-9]/g, '_');
            const t = e.target.replace(/[^a-zA-Z0-9]/g, '_');
            const l = (e.label || "").replace(/"/g, "'");
            mermaid += `  ${s} --> |"${l}"| ${t}\n`;
        });

        console.log(`[ARCHITECTURE_API] Blueprint built successfully.`);

        return NextResponse.json({ 
            mermaid, 
            summary: data.summary,
            nodes: data.nodes,
            repo: repoFullName 
        }, { status: 200 });

    } catch (err: any) {
        console.error("[ARCHITECTURE_API] Core Logic failure:", err);
        return NextResponse.json({ message: "Blueprint synthesis failed." }, { status: 500 });
    }
  } catch (error: any) {
    console.error("[ARCHITECTURE_API] Critical failure:", error.message);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
