export async function copyPngBlobToClipboard(blob: Blob): Promise<void> {
  const ClipboardItemCtor = (window as typeof window & {
    ClipboardItem?: typeof ClipboardItem;
  }).ClipboardItem;

  if (!navigator.clipboard?.write || !ClipboardItemCtor) {
    throw new Error("Clipboard image writing is not available");
  }

  await navigator.clipboard.write([
    new ClipboardItemCtor({
      "image/png": blob,
    }),
  ]);
}
