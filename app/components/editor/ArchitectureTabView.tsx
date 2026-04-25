'use client';

import React from 'react';
import ArchitectureMap from './ArchitectureMap';
import { useWorkspace } from './WorkspaceContext';

const ArchitectureTabView = () => {
    const { boot, bootStatus } = useWorkspace();
    const [repoFullName, setRepoFullName] = React.useState<string | null>(null);

    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const repo = params.get('repo');
        setRepoFullName(repo);

        if (!bootStatus || bootStatus === 'idle') {
            if (repo) {
                const [owner, name] = repo.split('/');
                boot(owner, name);
            }
        }
    }, [bootStatus, boot]);

    const handleNotify = React.useCallback((message: string, severity: 'success' | 'error' | 'info') => {
        console.log(`[ArchitectureTabView] ${severity}: ${message}`);
    }, []);

    return (
        <div className="h-full w-full bg-black">
            {repoFullName ? (
                <ArchitectureMap repoFullName={repoFullName} onNotify={handleNotify} />
            ) : (
                <div className="flex items-center justify-center h-full text-white">
                    <p>Loading repository information...</p>
                </div>
            )}
        </div>
    );
};

export default ArchitectureTabView;
