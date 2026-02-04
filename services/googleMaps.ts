// src/services/googleMaps.ts

let mapsPromise: Promise<typeof google> | null = null;

function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // If it already exists, just resolve when it's loaded
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if ((window as any).google?.maps) return resolve();
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () =>
        reject(new Error('Google Maps script failed to load'))
      );
      return;
    }

    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Google Maps script failed to load'));
    document.head.appendChild(s);
  });
}

export async function loadGoogleMaps(): Promise<typeof google> {
  if ((window as any).google?.maps) return window.google;

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error(
      'Missing VITE_GOOGLE_MAPS_API_KEY in .env(.local). Restart Vite after adding it.'
    );
  }

  if (!mapsPromise) {
    const src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&v=weekly&loading=async`;

    mapsPromise = (async () => {
      await injectScript(src);

      // Ensure Places is available (modern way)
      if ((window as any).google?.maps?.importLibrary) {
        await window.google.maps.importLibrary('places');
      }
      return window.google;
    })();
  }

  return mapsPromise;
}
