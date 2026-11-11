export type ShareDestination = 'WhatsApp' | 'Drive';
interface FileShareApi {
  canShare?: (data: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
}
export async function shareScanPdf(file: File, destination: ShareDestination, api: FileShareApi = navigator): Promise<{ status: 'shared' | 'cancelled' | 'unsupported' | 'error'; message: string }> {
  const data: ShareData = { files: [file], title: file.name };

  try {
  if (!api.canShare?.({ files: [file] }) || !api.share) return { status: 'unsupported', message: `Browser ini belum mendukung berbagi file PDF. Unduh PDF, lalu ${destination === 'Drive' ? 'unggah ke aplikasi Google Drive' : 'lampirkan melalui aplikasi WhatsApp'}.` };
    await api.share(data);
    return { status: 'shared', message: 'File telah diserahkan ke menu berbagi perangkat. Periksa aplikasi tujuan untuk memastikan proses selesai.' };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return { status: 'cancelled', message: 'Berbagi dibatalkan. PDF tetap tersedia di sini.' };
    return { status: 'error', message: `File belum dapat dibagikan. Coba lagi atau unduh PDF lalu buka ${destination}.` };
  }
}
