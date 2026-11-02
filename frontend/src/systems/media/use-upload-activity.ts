import { useCallback, useState } from "react";

/** A form stays busy until every image editor has finished its upload. */
export function useUploadActivity() {
  const [pending, setPending] = useState(0);
  const setUploading = useCallback((busy: boolean) => {
    setPending(count => Math.max(0, count + (busy ? 1 : -1)));
  }, []);
  return { uploading: pending > 0, setUploading };
}
