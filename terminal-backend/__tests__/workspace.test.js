const { sanitize, getProjectPath, WORKSPACE_ROOT, isValidGitUrl } = require('../lib/workspace-manager');
const path = require('path');
const fs = require('fs');

async function test() {
    console.log('Running Workspace Manager Tests...');

    // Test 1: Sanitization
    console.log('Test 1: Sanitization');
    const cases = [
        { input: '../../etc', expected: 'etc' },
        { input: 'my-project!', expected: 'my-project' },
        { input: 'user_name', expected: 'user_name' },
        { input: null, expected: 'default' },
        { input: '', expected: 'default' }
    ];

    cases.forEach(c => {
        const result = sanitize(c.input);
        if (result === c.expected) {
            console.log(`  ✅ Input: "${c.input}" -> "${result}"`);
        } else {
            console.log(`  ❌ Input: "${c.input}" -> Expected "${c.expected}", got "${result}"`);
            process.exit(1);
        }
    });

    // Test 2: Path Resolution (Traversal Prevention)
    console.log('\nTest 2: Path Resolution (Traversal Prevention)');
    try {
        const owner = '../../etc';
        const repo = 'passwd';
        const projectPath = await getProjectPath(owner, repo, null, null);
        const resolvedRoot = path.resolve(WORKSPACE_ROOT);
        
        if (projectPath.startsWith(resolvedRoot)) {
            console.log(`  ✅ Resolved path "${projectPath}" is within root "${resolvedRoot}"`);
        } else {
            console.log(`  ❌ Resolved path "${projectPath}" escaped root!`);
            process.exit(1);
        }
    } catch (err) {
        console.log(`  ✅ Caught expected error or handled safely: ${err.message}`);
    }

    // Test 3: URL Validation
    console.log('\nTest 3: URL Validation');
    const urlCases = [
        { url: 'https://github.com/user/repo', expected: true },
        { url: 'git@github.com:user/repo.git', expected: true },
        { url: 'http://malicious.com; rm -rf /', expected: false }, // only https and git@ allowed
        { url: 'ftp://github.com/user/repo', expected: false },
        { url: 'javascript:alert(1)', expected: false },
        { url: null, expected: false }
    ];

    urlCases.forEach(c => {
        const result = isValidGitUrl(c.url);
        if (result === c.expected) {
            console.log(`  ✅ URL: "${c.url}" -> ${result}`);
        } else {
            console.log(`  ❌ URL: "${c.url}" -> Expected ${c.expected}, got ${result}`);
            process.exit(1);
        }
    });

    console.log('\nAll tests passed!');
}

test();
