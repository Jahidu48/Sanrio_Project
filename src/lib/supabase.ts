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
 * Client-side Smart Image Compressor using HTML5 Canvas.
 * Compresses raw 4MB-10MB smartphone photos down to ~90KB-150KB
 * to prevent localStorage QuotaExceededError and speed up realtime sync 20x.
 */
export async function compressImageBlob(
  file: File | Blob,
  maxDimension = 1280,
  quality = 0.78
): Promise<Blob> {
  if (
    typeof window === "undefined" ||
    !file.type.startsWith("image/") ||
    file.type === "image/gif" ||
    file.type === "image/svg+xml"
  ) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (compressedBlob) => {
            if (compressedBlob && compressedBlob.size < file.size) {
              resolve(compressedBlob);
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          quality
        );
      } catch {
        resolve(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Upload chat attachment to Supabase Storage 'chat_media' bucket,
 * with automatic client-side image compression and fallback to compressed Data URL.
 */
export async function uploadChatMedia(
  file: File | Blob,
  path: string
): Promise<string> {
  const optimizedBlob = await compressImageBlob(file);

  const client = getSupabaseBrowserClient();
  if (client) {
    try {
      const { error } = await client.storage
        .from("chat_media")
        .upload(path, optimizedBlob, {
          cacheControl: "3600",
          upsert: true,
          contentType: optimizedBlob.type || "image/jpeg",
        });

      if (!error) {
        const { data } = client.storage.from("chat_media").getPublicUrl(path);
        if (data?.publicUrl) {
          return data.publicUrl;
        }
      }
    } catch {
      // Fallback to compressed data URL
    }
  }

  // Fallback to compressed base64 data URL
  return await blobToDataUrl(optimizedBlob);
}
