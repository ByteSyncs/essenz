import { optimizeImage } from './imageCompression'

export async function uploadImageFromClient(
  file: File,
  bucket: 'logos-url' | 'menu-items',
  slug: string,
): Promise<string> {
  const isLogo = bucket === 'logos-url'
  const compressed = await optimizeImage(file, isLogo)

  const form = new FormData()
  form.append('file', compressed, `${crypto.randomUUID()}.webp`)
  form.append('bucket', bucket)
  form.append('slug', slug)

  const res = await fetch('/api/storage/upload', {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `Upload failed: ${res.status}`)
  }

  const { url } = await res.json()
  return url
}
