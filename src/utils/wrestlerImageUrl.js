import { supabase } from '../supabaseClient';

const BUCKET = 'wrestler-images';

/**
 * DB rows sometimes store `.../wrestler-images//slug.webp` (double slash).
 * Storage object keys must not start with `/` or the public URL breaks.
 */
function normalizeWrestlerImagesObjectPath(raw) {
  if (!raw) return raw;
  return String(raw)
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/');
}

/** Belt-and-suspenders: some clients or DB values can still yield `.../wrestler-images//file` */
function collapseWrestlerImagesDoubleSlash(url) {
  if (!url || typeof url !== 'string') return url;
  return url.replace(/\/wrestler-images\/\/+/g, '/wrestler-images/');
}

/** Grey circle — avoids missing /images/placeholder.png */
export const WRESTLER_IMAGE_PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect fill="#3a3a3a" width="128" height="128" rx="64"/></svg>'
  );

/**
 * Rebuilds a wrestler-images public URL using the current Supabase project so rows
 * that still point at an old project ref (or copied DB) load correctly.
 */
export function rewriteWrestlerStorageUrl(url) {
  if (!url || typeof url !== 'string') return url;
  const trimmed = url.trim();
  const m = trimmed.match(/\/storage\/v1\/object\/public\/wrestler-images\/([^?#]+)/);
  if (!m) return collapseWrestlerImagesDoubleSlash(trimmed);
  const path = normalizeWrestlerImagesObjectPath(decodeURIComponent(m[1]));
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return collapseWrestlerImagesDoubleSlash(data.publicUrl);
}

export function getPublicWrestlerImageUrl(wrestlerId, ext) {
  const id = String(wrestlerId || '').replace(/^\/+/, '');
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(`${id}.${ext}`);
  return collapseWrestlerImagesDoubleSlash(data.publicUrl);
}

/**
 * Apply to each wrestler row after fetch/update so image_url / full_body_image_url
 * always match this app's Supabase project.
 */
export function normalizeWrestlerImageFields(w) {
  if (!w) return w;
  const next = { ...w };
  if (next.image_url && String(next.image_url).trim()) {
    next.image_url = rewriteWrestlerStorageUrl(next.image_url);
  } else if (next.id) {
    next.image_url = getPublicWrestlerImageUrl(next.id, 'png');
  }
  if (next.full_body_image_url && String(next.full_body_image_url).trim()) {
    next.full_body_image_url = rewriteWrestlerStorageUrl(next.full_body_image_url);
  }
  if (next.image_url) next.image_url = collapseWrestlerImagesDoubleSlash(next.image_url);
  if (next.full_body_image_url) {
    next.full_body_image_url = collapseWrestlerImagesDoubleSlash(next.full_body_image_url);
  }
  return next;
}

/** png 404 → same slug .webp → neutral placeholder */
export function createWrestlerImageUrlErrorHandler(wrestler) {
  return (e) => {
    const img = e.currentTarget;
    const id = wrestler?.id;
    if (id && img.src.includes(`${id}.png`)) {
      img.src = getPublicWrestlerImageUrl(id, 'webp');
      return;
    }
    img.src = WRESTLER_IMAGE_PLACEHOLDER;
    img.onerror = null;
  };
}
