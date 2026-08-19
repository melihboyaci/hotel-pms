/**
 * Logo Helper — Otel logosunu base64 formatına çevirir
 *
 * pdfmake görselleri sadece base64 veya URL olarak kabul eder.
 * Bu modül /logo.png dosyasını bir kez fetch edip module-level
 * cache'de tutar, tekrar eden PDF üretimlerinde yeniden indirmez.
 */

let cachedLogoBase64: string | null = null

export async function getLogoBase64(): Promise<string> {
  if (cachedLogoBase64) return cachedLogoBase64

  try {
    const response = await fetch('/logo.png')
    const blob = await response.blob()

    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        cachedLogoBase64 = reader.result as string
        resolve(cachedLogoBase64)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (err) {
    console.warn('Logo yüklenemedi, PDF logosuz oluşturulacak:', err)
    // Boş 1x1 transparent PNG (fallback)
    const fallback =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    cachedLogoBase64 = fallback
    return fallback
  }
}
