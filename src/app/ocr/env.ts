type OcrEnv = {
  VITE_FEATURE_OCR?: string;
};

export function isOcrHandwrittenMemoEnabled(
  env: OcrEnv = import.meta.env,
): boolean {
  return env.VITE_FEATURE_OCR === "1";
}
