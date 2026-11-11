import type * as OpenCV from '@techstark/opencv-js';
import { validCorners, type Corners, type Point } from './documentScanner';

type Cv = typeof OpenCV;

/** Banyak kandidat kontur, bukan satu blob tepi yang harus tersambung sempurna. */
export function detectDocument(cv: Cv, image: ImageData, focus: Point | null = null): Corners | null {
  const { width: w, height: h } = image;
  if (w < 20 || h < 20) return null;
  const owned: { delete(): void }[] = [];
  const keep = <T extends { delete(): void }>(mat: T): T => { owned.push(mat); return mat; };
  try {
    const src = keep(cv.matFromImageData(image)), rgb = keep(new cv.Mat()), gray = keep(new cv.Mat());
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB);
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    const channels = keep(new cv.MatVector()); cv.split(rgb, channels);
    const planes = [gray];
    for (let k = 0; k < 3; k++) planes.push(keep(channels.get(k)));
    const blur = keep(new cv.Mat()), edges = keep(new cv.Mat()), closed = keep(new cv.Mat());
    const kernel = keep(cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3)));
    let best: Corners | null = null, bestScore = 0;
    const candidates = new Map<string, number>();
    const scoreQuad = (corners: Corners) => {
      if (!validCorners(corners)) return;
      // Saat pengguna mengetuk, pilih dokumen yang melingkupi titik itu, bukan yang terbesar di tempat lain.
      if (focus && !corners.every((a,i)=>{const b=corners[(i+1)%4];return (b.x-a.x)*(focus.y-a.y)-(b.y-a.y)*(focus.x-a.x)>=-0.003;})) return;
      const area = Math.abs(corners.reduce((sum, p, i) => { const q = corners[(i + 1) % 4]; return sum + p.x * q.y - q.x * p.y; }, 0)) / 2;
      if (area < 0.06 || area > 0.985) return;
      const lengths = corners.map((a, i) => { const b = corners[(i+1)%4]; return Math.hypot((a.x-b.x)*w,(a.y-b.y)*h); });
      if (Math.min(...lengths) < Math.min(w,h)*0.12 || Math.max(...lengths) / Math.min(...lengths) > 7) return;
      // Kontur tepi seluruh frame bukan dokumen.
      const onFrame = corners.filter(p => p.x < 0.008 || p.y < 0.008 || p.x > 0.992 || p.y > 0.992).length;
      if (onFrame > 2) return;
      const key = corners.map(p => `${Math.round(p.x*40)},${Math.round(p.y*40)}`).join(':');
      const repeats = (candidates.get(key) || 0) + 1; candidates.set(key, repeats);
      let support = 0, weakest = 1;
      for (let side=0; side<4; side++) {
        const a=corners[side], b=corners[(side+1)%4], dx=(b.x-a.x)*w, dy=(b.y-a.y)*h, length=Math.hypot(dx,dy);
        const nx=-dy/length, ny=dx/length;
        let sum=0;
        for(let t=0.1;t<=0.9;t+=0.05){
          const x=(a.x+(b.x-a.x)*t)*(w-1),y=(a.y+(b.y-a.y)*t)*(h-1);
          let peak=0;
          // Comparisons spanning the edge tolerate blur, shadows, and contour offsets.
          for(const distance of [1,2,4]) {
            const x1=Math.max(0,Math.min(w-1,Math.round(x+nx*distance))),y1=Math.max(0,Math.min(h-1,Math.round(y+ny*distance)));
            const x2=Math.max(0,Math.min(w-1,Math.round(x-nx*distance))),y2=Math.max(0,Math.min(h-1,Math.round(y-ny*distance)));
            for(let k=0;k<3;k++) peak=Math.max(peak,Math.abs(image.data[(y1*w+x1)*4+k]-image.data[(y2*w+x2)*4+k]));
          }
          sum+=Math.min(1,peak/30);
        }
        const sideSupport=sum/17;support+=sideSupport/4;weakest=Math.min(weakest,sideSupport);
      }
      if(support<0.14 || weakest<0.035) return;
      const cx=corners.reduce((sum,p)=>sum+p.x,0)/4,cy=corners.reduce((sum,p)=>sum+p.y,0)/4;
      const centered=1-Math.min(1,Math.hypot(cx-0.5,cy-0.5));
      const score=Math.pow(area,0.8)*(0.4+support*0.6)*(0.8+0.2*centered)*(1+Math.min(repeats-1,4)*0.025);
      if(score>bestScore){best=corners;bestScore=score;}
    };
    const collect = (mask: OpenCV.Mat) => {
      const contours = new cv.MatVector(), hierarchy = new cv.Mat();
      try {
        cv.findContours(mask,contours,hierarchy,cv.RETR_LIST,cv.CHAIN_APPROX_SIMPLE);
        const order: {index:number;area:number}[]=[];
        for(let i=0;i<contours.size();i++){const contour=contours.get(i);try{const area=Math.abs(cv.contourArea(contour));if(area>w*h*0.055)order.push({index:i,area});}finally{contour.delete();}}
        order.sort((a,b)=>b.area-a.area);
        for(const item of order.slice(0,focus ? 36 : 18)) {
          const contour=contours.get(item.index), approx=new cv.Mat();
          try {
            const perimeter=cv.arcLength(contour,true);
            for(const epsilon of [0.012,0.02,0.035,0.05]) {
              cv.approxPolyDP(contour,approx,epsilon*perimeter,true);
              if(approx.rows!==4 || !cv.isContourConvex(approx))continue;
              const fidelity = Math.abs(cv.contourArea(approx)) / Math.max(1,item.area);
              if(fidelity < 0.88 || fidelity > 1.15)continue;
              const points: Point[]=[];for(let i=0;i<8;i+=2)points.push({x:approx.data32S[i]/(w-1),y:approx.data32S[i+1]/(h-1)});
              const cx=points.reduce((s,p)=>s+p.x,0)/4,cy=points.reduce((s,p)=>s+p.y,0)/4;
              points.sort((a,b)=>Math.atan2(a.y-cy,a.x-cx)-Math.atan2(b.y-cy,b.x-cx));
              const first=points.reduce((min,p,i)=>p.x+p.y<points[min].x+points[min].y?i:min,0);
              scoreQuad([...points.slice(first),...points.slice(0,first)] as Corners);
            }
          } finally {approx.delete();contour.delete();}
        }
      } finally {contours.delete();hierarchy.delete();}
    };
    for(const plane of planes) {
      cv.GaussianBlur(plane,blur,new cv.Size(5,5),0,0,cv.BORDER_DEFAULT);
      for(const [low,high] of [[20,70],[55,160],[6,24]]) {
        cv.Canny(blur,edges,low,high);
        cv.morphologyEx(edges,closed,cv.MORPH_CLOSE,kernel);
        collect(closed);
      }
      // Inner/outer contours cover light-on-dark and dark-on-light sheets alike.
      cv.threshold(blur,edges,0,255,cv.THRESH_BINARY+cv.THRESH_OTSU);collect(edges);
    }
    // Local thresholding can recover a page where one half is in shadow.
    cv.GaussianBlur(gray,blur,new cv.Size(5,5),0);
    cv.adaptiveThreshold(blur,edges,255,cv.ADAPTIVE_THRESH_GAUSSIAN_C,cv.THRESH_BINARY,31,7);collect(edges);
    if (best) return refineDocumentCorners(image, best);
    return best;
  } finally {for(let i=owned.length-1;i>=0;i--)owned[i].delete();}
}

/** Pasangkan garis pada transisi warna asli, bukan batas hasil blur/threshold. */
function refineDocumentCorners(image: ImageData, corners: Corners): Corners {
  const {width:w,height:h,data}=image;
  const lines=corners.map((a,i)=>{
    const b=corners[(i+1)%4],dx=(b.x-a.x)*(w-1),dy=(b.y-a.y)*(h-1),length=Math.hypot(dx,dy),nx=-dy/length,ny=dx/length;
    const samples: Point[]=[];
    for(let t=0.12;t<=0.88;t+=0.04){
      const x=(a.x+(b.x-a.x)*t)*(w-1),y=(a.y+(b.y-a.y)*t)*(h-1);
      const values:{d:number;score:number}[]=[];
      for(let d=-6;d<=6;d+=0.5){
        const point=(offset:number)=>{const px=Math.max(0,Math.min(w-1,Math.round(x+nx*(d+offset)))),py=Math.max(0,Math.min(h-1,Math.round(y+ny*(d+offset))));return (py*w+px)*4;};
        const left=point(-1.5),right=point(1.5);
        let score=0;for(let k=0;k<3;k++)score=Math.max(score,Math.abs(data[left+k]-data[right+k]));
        values.push({d,score:score/(1+Math.abs(d)*0.025)});
      }
      const peak=Math.max(...values.map(p=>p.score));if(peak<5)continue;
      const near=values.filter(p=>p.score>=peak*0.94),delta=near.reduce((s,p)=>s+p.d,0)/near.length;
      samples.push({x:x+nx*delta,y:y+ny*delta});
    }
    const fit=(pts:Point[])=>{
      if(pts.length<6)return {x:nx,y:ny,c:nx*a.x*(w-1)+ny*a.y*(h-1)};
      const mx=pts.reduce((s,p)=>s+p.x,0)/pts.length,my=pts.reduce((s,p)=>s+p.y,0)/pts.length;
      let xx=0,yy=0,xy=0;for(const p of pts){xx+=(p.x-mx)**2;yy+=(p.y-my)**2;xy+=(p.x-mx)*(p.y-my);}
      const angle=Math.atan2(2*xy,xx-yy)/2,x=-Math.sin(angle),y=Math.cos(angle);return {x,y,c:x*mx+y*my};
    };
    const first=fit(samples);return fit(samples.filter(p=>Math.abs(first.x*p.x+first.y*p.y-first.c)<2.5));
  });
  const refined=lines.map((b,i)=>{
    const a=lines[(i+3)%4],det=a.x*b.y-b.x*a.y;
    if(Math.abs(det)<1e-5)return corners[i];
    const p={x:(a.c*b.y-b.c*a.y)/det/(w-1),y:(a.x*b.c-b.x*a.c)/det/(h-1)};
    return Math.hypot(p.x-corners[i].x,p.y-corners[i].y)<0.06?p:corners[i];
  }) as Corners;
  return validCorners(refined)?refined:corners;
}
