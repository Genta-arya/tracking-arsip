export type WorkWeek = 5 | 6 | 7;

export function calculateScanPlan(quantity: number, dailyTarget: number, startDate: string, workWeek: WorkWeek) {
  if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error('Jumlah berkas harus berupa bilangan bulat 0 atau lebih.');
  if (!Number.isSafeInteger(dailyTarget) || dailyTarget <= 0) throw new Error('Target harian harus berupa bilangan bulat lebih dari 0.');
  if (![5, 6, 7].includes(workWeek)) throw new Error('Pilih jumlah hari kerja yang valid.');
  const start = new Date(`${startDate}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !Number.isFinite(start.getTime()) || start.toISOString().slice(0, 10) !== startDate) {
    throw new Error('Pilih tanggal mulai yang valid.');
  }
  if (!quantity) return { workingDays: 0, finishDate: null, lastDayFiles: 0 };
  const workingDays = Math.ceil(quantity / dailyTarget);
  const isWorkingDay = () => workWeek === 7 || (start.getUTCDay() !== 0 && (workWeek === 6 || start.getUTCDay() !== 6));
  while (!isWorkingDay()) start.setUTCDate(start.getUTCDate() + 1);
  let remaining = workingDays - 1;
  const fullWeeks = Math.floor(remaining / workWeek);
  start.setUTCDate(start.getUTCDate() + fullWeeks * 7);
  if (!Number.isFinite(start.getTime()) || start.getUTCFullYear() > 9999) throw new Error('Rentang simulasi terlalu panjang. Kurangi jumlah berkas atau tambah target harian.');
  remaining %= workWeek;
  while (remaining > 0) {
    start.setUTCDate(start.getUTCDate() + 1);
    if (isWorkingDay()) remaining--;
  }
  if (start.getUTCFullYear() > 9999) throw new Error('Rentang simulasi terlalu panjang.');
  return { workingDays, finishDate: start.toISOString().slice(0, 10), lastDayFiles: quantity - dailyTarget * (workingDays - 1) };
}
