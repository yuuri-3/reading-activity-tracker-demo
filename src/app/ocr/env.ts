type OcrEnv = {
  VITE_ENABLE_OCR_HANDWRITTEN_MEMO?: string;
};

export function isOcrHandwrittenMemoEnabled(
  env: OcrEnv = import.meta.env
): boolean {
  return env.VITE_ENABLE_OCR_HANDWRITTEN_MEMO === "true";
}
