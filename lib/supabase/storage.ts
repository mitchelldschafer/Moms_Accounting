import { supabase } from './client';

/**
 * Get a signed URL for a document file
 * This allows authenticated users to access private bucket files
 */
export async function getSignedFileUrl(filePath: string): Promise<string | null> {
    // Extract the file path from a full URL if needed
    let path = filePath;

    // If it's a full URL, extract just the path portion
    if (filePath.includes('/storage/v1/object/public/')) {
        path = filePath.split('/storage/v1/object/public/tax-documents/')[1];
    } else if (filePath.includes('/storage/v1/object/sign/')) {
        // Already a signed URL path
        path = filePath.split('/storage/v1/object/sign/tax-documents/')[1];
    }

    if (!path) {
        console.error('Could not extract file path from URL:', filePath);
        return null;
    }

    const { data, error } = await supabase.storage
        .from('tax-documents')
        .createSignedUrl(path, 3600); // 1 hour expiry

    if (error) {
        console.error('Error creating signed URL:', error);
        return null;
    }

    return data.signedUrl;
}

/**
 * Download a document file
 */
export async function downloadFile(filePath: string): Promise<Blob | null> {
    // Extract the file path from a full URL if needed
    let path = filePath;

    if (filePath.includes('/storage/v1/object/')) {
        const match = filePath.match(/\/tax-documents\/(.+)$/);
        if (match) {
            path = match[1];
        }
    }

    const { data, error } = await supabase.storage
        .from('tax-documents')
        .download(path);

    if (error) {
        console.error('Error downloading file:', error);
        return null;
    }

    return data;
}
