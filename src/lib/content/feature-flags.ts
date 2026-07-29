/**
 * Competition-mode flags for the content calendar.
 * Flip CONTENT_IMAGES_ENABLED to true post-competition to restore FLUX.
 */
export const CONTENT_IMAGES_ENABLED =
  process.env.CONTENT_IMAGES_ENABLED === "true";
