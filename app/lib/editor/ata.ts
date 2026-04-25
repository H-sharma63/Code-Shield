import { setupTypeAcquisition } from '@typescript/ata';
import type * as monaco from 'monaco-editor';
import ts from 'typescript';

/**
 * ATA (Automatic Type Acquisition) Engine for Monaco
 * 
 * Fetches TypeScript definitions for third-party libraries automatically
 * and injects them into the Monaco environment for rich IntelliSense.
 */

const ATA_CACHE_NAME = 'CodeShield-ATA-Cache-v1';

/**
 * A cached fetcher that uses the browser's Cache API to store .d.ts files.
 */
async function cachedFetcher(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = input.toString();
  try {
    const cache = await caches.open(ATA_CACHE_NAME);
    const cachedResponse = await cache.match(url);
    if (cachedResponse) {
      return cachedResponse;
    }

    const response = await fetch(input, init);
    if (response.ok) {
      await cache.put(url, response.clone());
    }
    return response;
  } catch (error) {
    console.error('ATA Fetch Error:', error);
    return fetch(input, init); // Fallback to normal fetch
  }
}

export function createATA(monacoInstance: any) {
  const ata = setupTypeAcquisition({
    projectName: 'CodeShield IDE',
    typescript: ts,
    logger: console,
    delegate: {
      receivedFile: (code, path) => {
        // Inject types into Monaco's TypeScript language service
        monacoInstance.languages.typescript.typescriptDefaults.addExtraLib(
          code, 
          `file:///node_modules/${path}`
        );
      },
      progress: (downloaded, estimatedTotal) => {
         // console.log(`ATA Progress: ${downloaded}/${estimatedTotal}`);
      },
      finished: (files) => {
         // console.log('ATA sync complete');
      }
    },
    // Custom fetcher to enable persistence via Cache API
    fetcher: cachedFetcher
  });

  return ata;
}
