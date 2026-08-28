
export const fetchWithCorsFallback = async (url: string): Promise<Response> => {
    // Attempt 1: Direct fetch
    try {
        const response = await fetch(url);
        if (response.ok) {
            return response;
        }
    } catch (e) {
        console.warn('Direct fetch failed, trying CORS proxies:', e);
    }

    // Attempt 2: corsproxy.io (Often faster/more reliable for images)
    try {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (response.ok) {
            return response;
        }
    } catch (e) {
        console.warn('CorsProxy.io failed, trying next proxy:', e);
    }

    // Attempt 3: AllOrigins (Fallback)
    try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (response.ok) {
            return response;
        }
    } catch (e) {
        console.warn('AllOrigins failed:', e);
    }

    throw new Error(`Could not fetch media. The URL may be blocked or invalid.`);
};

export const loadMediaFromUrl = async (url: string): Promise<{ blobUrl: string, type: 'image' | 'video' }> => {
    try {
        const response = await fetchWithCorsFallback(url);
        const blob = await response.blob();
        
        let type: 'image' | 'video' = 'image';
        
        // Trust MIME type first
        if (blob.type.startsWith('video/')) {
            type = 'video';
        } else if (blob.type.startsWith('image/')) {
            type = 'image';
        } else {
            // Fallback: Check file extension from URL if MIME type is generic/missing
            const cleanUrl = url.split('?')[0].toLowerCase();
            if (cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || cleanUrl.endsWith('.mov')) {
                type = 'video';
            }
        }

        const objectURL = URL.createObjectURL(blob);
        return { blobUrl: objectURL, type };
    } catch (error) {
        // Provide a user-friendly error message
        const msg = error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Media Error: ${msg}. Try downloading the image and uploading it manually.`);
    }
};
