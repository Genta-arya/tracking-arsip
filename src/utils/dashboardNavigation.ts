export const DASHBOARD_NAVIGATION_EVENT = 'archive-dashboard-navigation';
export type DashboardTab = 'summary' | 'daily' | 'analysis';
export type MainTab = 'progress' | 'rekapitulasi';
const dashboardSlugs: Record<DashboardTab, string> = { summary: 'ringkasan', daily: 'harian', analysis: 'analisis' };

export function readDashboardRoute(search: string): { mainTab: MainTab; dashboardTab: DashboardTab } {
  const tab = new URLSearchParams(search).get('tab')?.toLowerCase();
  if (tab === 'rekapitulasi') return { mainTab: 'rekapitulasi', dashboardTab: 'summary' };
  return { mainTab: 'progress', dashboardTab: tab === 'harian' ? 'daily' : tab === 'analisis' ? 'analysis' : 'summary' };
}

export function dashboardTabUrl(href: string, tab: DashboardTab): string {
  const url = new URL(href);
  url.searchParams.set('tab', dashboardSlugs[tab]);
  return url.toString();
}
