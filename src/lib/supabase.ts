import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes("your-project-id") &&
    !supabaseAnonKey.includes("your-supabase-anon-key")
);

let browserSupabaseClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }
  if (!browserSupabaseClient) {
    browserSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 30,
        },
      },
    });
  }
  return browserSupabaseClient;
}

export function createSupabaseServerClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  });
}

/**
 * Convert file/blob to data URL for instant local previews and fallback storage
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Upload chat attachment to Supabase Storage 'chat_media' bucket,
 * with automatic fallback to data URL when bucket is not yet created.
 */
export async function uploadChatMedia(
  file: File | Blob,
  path: string
): Promise<string> {
  const client = getSupabaseBrowserClient();
  if (client) {
    try {
      const { error } = await client.storage
        .from("chat_media")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (!error) {
        const { data } = client.storage.from("chat_media").getPublicUrl(path);
        if (data?.publicUrl) {
          return data.publicUrl;
        }
      }
    } catch {
      // Fallback to data URL
    }
  }

  // Fallback to base64 data URL
  return await blobToDataUrl(file);
}
