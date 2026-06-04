import type { SupabaseClient } from '@supabase/supabase-js'
import supabase from './supabase'

export const uploadOptimizedImage = async (
  file: File,
  bucketName: 'logos-url' | 'menu-items',
  slug?: string,
  customClient?: SupabaseClient,
): Promise<string> => {
  const client = customClient || supabase

  const isLogo = bucketName === 'logos-url'
  const prefix = slug ? `${slug}/` : ''
  const fileName = `${prefix}${crypto.randomUUID()}.webp`

  const { error } = await client.storage.from(bucketName).upload(fileName, file, {
    cacheControl: isLogo ? '31536000' : '3600',
    upsert: false,
    contentType: 'image/webp',
  })

  if (error) throw error

  const {
    data: { publicUrl },
  } = client.storage.from(bucketName).getPublicUrl(fileName)

  return publicUrl
}
