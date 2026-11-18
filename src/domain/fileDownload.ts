declare global {
  interface Window {
    AndroidFileBridge?: {
      saveFileBase64: (
        base64Data: string,
        fileName: string,
        mimeType: string
      ) => void;
    };
  }
}

/**
 * Saves a Blob cleanly on both native Android APK (via AndroidFileBridge -> Downloads/RPGMTranslator)
 * and standard desktop/mobile browsers.
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  if (typeof window !== 'undefined' && window.AndroidFileBridge) {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      const base64 = commaIdx >= 0 ? result.slice(commaIdx + 1) : result;
      window.AndroidFileBridge?.saveFileBase64(
        base64,
        filename,
        blob.type || 'application/octet-stream'
      );
    };
    reader.readAsDataURL(blob);
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
