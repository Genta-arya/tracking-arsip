import type { Corners, Point } from './documentScanner';

/** Satu antrean worker untuk preview kamera dan analisis foto resolusi lebih tinggi. */
export class DocumentDetector {
  private worker: Worker;
  private sequence = 0;
  private pending = new Map<number, { resolve(value: Corners | null): void; reject(error: Error): void; timer: ReturnType<typeof setTimeout> }>();
  private initialization: Promise<void>;
  private stopped = false;
  private cancelInitialization: () => void = () => undefined;
  private failure: Error | null = null;
  constructor() {
    this.worker = new Worker(new URL('../workers/documentDetection.worker.ts', import.meta.url), { type: 'module' });
    this.initialization = new Promise((resolve,reject) => {
      const timer=setTimeout(()=>{this.fail(new Error('Mesin deteksi terlalu lama dimuat. Buka ulang scanner untuk mencoba kembali.'));reject(this.failure);},45000);
      this.cancelInitialization = () => { clearTimeout(timer); reject(new Error('Scanner sudah ditutup.')); };
      this.worker.onmessage = ({data}) => {
        if(data.ready){clearTimeout(timer);resolve();return;}
        if(data.id===undefined && data.error){clearTimeout(timer);this.fail(new Error(data.error));reject(this.failure);return;}
        const job=this.pending.get(data.id);if(!job)return;
        clearTimeout(job.timer);this.pending.delete(data.id);
        if(data.error)job.reject(new Error(data.error));else job.resolve(data.corners);
      };
      this.worker.onerror = () => {clearTimeout(timer);this.fail(new Error('Mesin deteksi tidak tersedia. Buka ulang scanner untuk mencoba kembali.'));reject(this.failure);};
    });
    // Initialization may start before the first detection request.
    void this.initialization.catch(()=>undefined);
  }
  private fail(error: Error) {
    this.failure=error;
    for(const job of this.pending.values()){clearTimeout(job.timer);job.reject(error);}this.pending.clear();
  }
  async ready(): Promise<void> {await this.initialization;if(this.stopped)throw new Error('Scanner sudah ditutup.');if(this.failure)throw this.failure;}
  async detect(source: CanvasImageSource, width: number, height: number, maxSide=960, focus: Point | null = null): Promise<Corners | null> {
    await this.ready();
    const canvas=document.createElement('canvas'),scale=Math.min(1,maxSide/Math.max(width,height));
    canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
    const ctx=canvas.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(source,0,0,canvas.width,canvas.height);
    const image=ctx.getImageData(0,0,canvas.width,canvas.height),id=++this.sequence;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('Deteksi belum selesai. Coba ulang dengan foto yang lebih jelas.'));},20000);
      this.pending.set(id,{resolve,reject,timer});
      this.worker.postMessage({id,width:image.width,height:image.height,focus,buffer:image.data.buffer},[image.data.buffer]);
    });
  }
  dispose(): void {this.stopped=true;this.cancelInitialization();this.worker.terminate();this.fail(new Error('Scanner sudah ditutup.'));}
}
