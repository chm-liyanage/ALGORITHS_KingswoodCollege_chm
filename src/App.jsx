import React, { useState, useEffect } from 'react';
import { initialInventory } from './data/inventoryData';
import { initialDocuments } from './data/documentData';
import { staffDirectory } from './data/staffData';
import OverviewHome from './components/OverviewHome';
import GearLedger from './components/GearLedger';
import DocumentExplorer from './components/DocumentExplorer';
import ReservationSchedule from './components/ReservationSchedule';
import TeamRoster from './components/TeamRoster';
import ActivityFeed from './components/ActivityFeed';
import CommandPalette from './components/CommandPalette';
import StaffProfileDrawer from './components/StaffProfileDrawer';
import ConfirmDialog from './components/ConfirmDialog';
import {
  Home,
  Cpu,
  FileText,
  Activity,
  ShieldCheck,
  RotateCcw,
  Boxes,
  Clock,
  CheckCircle2,
  Search,
  Wrench,
  Calendar,
  CalendarClock,
  Users,
  ChevronRight
} from 'lucide-react';

const SECTION_META = {
  home: {
    title: 'Overview',
    subtitle: 'Live lab readiness, active checkouts, and recent changes'
  },
  gear: {
    title: 'Gear & Checkouts',
    subtitle: 'Track equipment availability, asset tags, and repairs'
  },
  schedule: {
    title: 'Booking Schedule',
    subtitle: 'Reserve classroom and lab hardware in advance'
  },
  docs: {
    title: 'Document Vault',
    subtitle: 'Organize schematics, guides, notes, and uploaded files'
  },
  team: {
    title: 'Team Roster',
    subtitle: 'Directory of lab staff, active checkouts, and authored docs'
  }
};

const buildInitialReservations = () => {
  const d1 = new Date();
  d1.setDate(d1.getDate() + 1);
  const d2 = new Date();
  d2.setDate(d2.getDate() + 3);

  const staffOne = staffDirectory[0] ? `${staffDirectory[0].name} (${staffDirectory[0].role})` : 'Maya Lin';
  const staffTwo = staffDirectory[3] ? `${staffDirectory[3].name} (${staffDirectory[3].role})` : 'Elena Rostova';

  return [
    {
      id: 'RES-2041',
      gearId: 'ESP-AV-101',
      reservedBy: staffOne,
      date: d1.toISOString().split('T')[0],
      timeSlot: '09:00 - 12:00 (Morning)',
      purpose: 'Classroom 3B Smart-Wall Pilot Demo'
    },
    {
      id: 'RES-2042',
      gearId: 'ESP-IOT-009',
      reservedBy: staffTwo,
      date: d2.toISOString().split('T')[0],
      timeSlot: '13:00 - 16:30 (Afternoon)',
      purpose: 'Assembly Room Microclimate Telemetry Lab'
    }
  ];
};

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [gearStatusFilter, setGearStatusFilter] = useState('ALL');
  const [focusedGearItem, setFocusedGearItem] = useState(null);
  const [focusedDocItem, setFocusedDocItem] = useState(null);
  const [backupVersion, setBackupVersion] = useState(0);

  const [inventory, setInventory] = useState(() => {
    const saved = localStorage.getItem('ecospark_inventory');
    return saved ? JSON.parse(saved) : initialInventory;
  });

  const [documents, setDocuments] = useState(() => {
    const saved = localStorage.getItem('ecospark_docs');
    return saved ? JSON.parse(saved) : initialDocuments;
  });

  const [reservations, setReservations] = useState(() => {
    const saved = localStorage.getItem('ecospark_reservations');
    return saved ? JSON.parse(saved) : buildInitialReservations();
  });

  const [activities, setActivities] = useState(() => {
    const saved = localStorage.getItem('ecospark_activities');
    return saved ? JSON.parse(saved) : [
      { id: 1, text: 'Workspace initialized with primary lab gear and project files.', time: '08:30 AM' }
    ];
  });

  const [showActivityDrawer, setShowActivityDrawer] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [selectedHolder, setSelectedHolder] = useState(null);
  const [preselectedReserveGearId, setPreselectedReserveGearId] = useState(null);

  useEffect(() => {
    localStorage.setItem('ecospark_inventory', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem('ecospark_docs', JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    localStorage.setItem('ecospark_reservations', JSON.stringify(reservations));
  }, [reservations]);

  useEffect(() => {
    localStorage.setItem('ecospark_activities', JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const logActivity = (text) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setActivities((prev) => [{ id: Date.now(), text, time: timestamp }, ...prev]);
  };

  const navigateToSection = (tab, status = 'ALL') => {
    if (tab === 'gear') {
      setGearStatusFilter(status);
    }
    setActiveTab(tab);
  };

  const handleSelectGearFromPalette = (gearItem) => {
    setGearStatusFilter('ALL');
    setFocusedGearItem(gearItem);
    setActiveTab('gear');
  };

  const handleSelectDocFromPalette = (docItem) => {
    setFocusedDocItem(docItem);
    setActiveTab('docs');
  };

  const handleQuickReturn = (itemId) => {
    const target = inventory.find((i) => i.id === itemId);
    if (!target || target.status === 'Available') return;

    const today = new Date().toISOString().split('T')[0];
    const newRecord = {
      id: `H-${Date.now().toString().slice(-4)}`,
      date: today,
      type: 'Returned',
      user: target.holder || 'Staff Member',
      note: `Returned to ${target.location}`
    };

    logActivity(`Returned "${target.name}" (${target.id}) back to ${target.location}`);

    setInventory((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            status: 'Available',
            holder: null,
            returnDate: null,
            history: [newRecord, ...(item.history || [])]
          };
        }
        return item;
      })
    );
  };

  const handleFulfillReservation = (reservation) => {
    const target = inventory.find((i) => i.id === reservation.gearId);
    if (!target || target.status !== 'Available') return;

    const today = new Date().toISOString().split('T')[0];
    const newRecord = {
      id: `H-${Date.now().toString().slice(-4)}`,
      date: today,
      type: 'Dispatched',
      user: reservation.reservedBy,
      note: `Checked out from booking ${reservation.id} (${reservation.purpose})`
    };

    logActivity(
      `Checked out booked gear "${target.name}" (${target.id}) to ${reservation.reservedBy}`
    );

    setInventory((prev) =>
      prev.map((item) => {
        if (item.id === target.id) {
          return {
            ...item,
            status: 'In Use',
            holder: reservation.reservedBy,
            returnDate: reservation.date,
            history: [newRecord, ...(item.history || [])]
          };
        }
        return item;
      })
    );

    setReservations((prev) => prev.filter((r) => r.id !== reservation.id));
  };

  const handleReserveGearFromLedger = (gearId) => {
    setPreselectedReserveGearId(gearId);
    setActiveTab('schedule');
  };

  const handleExportBackup = () => {
    const today = new Date().toISOString().split('T')[0];
    const payload = {
      app: 'EcoSpark Ops Hub',
      exportedAt: new Date().toISOString(),
      inventory,
      documents,
      reservations,
      activities,
      customFolders: JSON.parse(localStorage.getItem('ecospark_custom_folders') || '[]'),
      pinnedDocIds: JSON.parse(localStorage.getItem('ecospark_pinned_docs') || '[]')
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ecospark-backup-${today}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    logActivity(`Saved workspace backup (ecospark-backup-${today}.json)`);
  };

  const handleImportBackup = (data) => {
    if (!data || !Array.isArray(data.inventory) || !Array.isArray(data.documents)) {
      return { ok: false };
    }

    const nextReservations = Array.isArray(data.reservations)
      ? data.reservations
      : [];
    const nextFolders = Array.isArray(data.customFolders)
      ? data.customFolders
      : [];
    const nextPinned = Array.isArray(data.pinnedDocIds)
      ? data.pinnedDocIds
      : [];

    setInventory(data.inventory);
    setDocuments(data.documents);
    setReservations(nextReservations);
    localStorage.setItem('ecospark_custom_folders', JSON.stringify(nextFolders));
    localStorage.setItem('ecospark_pinned_docs', JSON.stringify(nextPinned));
    setBackupVersion((v) => v + 1);

    const timestamp = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
    const priorLogs = Array.isArray(data.activities) ? data.activities : activities;
    setActivities([
      {
        id: Date.now(),
        text: `Restored backup (${data.inventory.length} gear, ${data.documents.length} files)`,
        time: timestamp
      },
      ...priorLogs
    ]);

    return {
      ok: true,
      gearCount: data.inventory.length,
      docCount: data.documents.length
    };
  };

  const executeResetDefaults = () => {
    setInventory(initialInventory);
    setDocuments(initialDocuments);
    setReservations(buildInitialReservations());
    setGearStatusFilter('ALL');
    setActivities([{ id: Date.now(), text: 'Demo data reset to starting defaults.', time: 'Just now' }]);
    localStorage.removeItem('ecospark_inventory');
    localStorage.removeItem('ecospark_docs');
    localStorage.removeItem('ecospark_reservations');
    localStorage.removeItem('ecospark_activities');
    localStorage.removeItem('ecospark_pinned_docs');
    localStorage.removeItem('ecospark_custom_folders');
    setBackupVersion((v) => v + 1);
    setShowResetConfirm(false);
  };

  const availableCount = inventory.filter((item) => item.status === 'Available').length;
  const inUseCount = inventory.filter((item) => item.status === 'In Use').length;
  const maintenanceCount = inventory.filter((item) => item.status === 'Maintenance').length;

  const currentSection = SECTION_META[activeTab] || SECTION_META.home;

  const primaryMenu = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      count: null,
      onClick: () => setActiveTab('home')
    },
    {
      id: 'gear',
      label: 'Gear',
      icon: Cpu,
      count: inventory.length,
      onClick: () => navigateToSection('gear', 'ALL')
    },
    {
      id: 'schedule',
      label: 'Schedule',
      icon: Calendar,
      count: reservations.length,
      accent: reservations.length > 0 ? 'sky' : null,
      onClick: () => setActiveTab('schedule')
    },
    {
      id: 'docs',
      label: 'Docs',
      icon: FileText,
      count: documents.length,
      onClick: () => setActiveTab('docs')
    },
    {
      id: 'team',
      label: 'Team',
      icon: Users,
      count: staffDirectory.length,
      onClick: () => setActiveTab('team')
    }
  ];

  const statusShortcuts = [
    {
      id: 'Available',
      label: 'Available',
      count: availableCount,
      dotClass: 'bg-emerald-400',
      activeText: 'text-emerald-300'
    },
    {
      id: 'In Use',
      label: 'In Use',
      count: inUseCount,
      dotClass: 'bg-amber-400',
      activeText: 'text-amber-300'
    },
    {
      id: 'Maintenance',
      label: 'In Repair',
      count: maintenanceCount,
      dotClass: 'bg-rose-400',
      activeText: 'text-rose-300'
    }
  ];

  return (
    <div className="min-h-screen hub-canvas text-zinc-100 font-sans flex flex-col lg:flex-row selection:bg-zinc-700 selection:text-white">
      <aside className="hidden lg:flex lg:w-64 xl:w-64 shrink-0 hub-sidebar flex-col justify-between sticky top-0 h-screen z-40">
        <div className="p-4 space-y-5 overflow-y-auto">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className="w-full flex items-center justify-between px-1.5 py-1 rounded-lg text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-9 h-9 rounded-lg bg-zinc-100 group-hover:bg-white shadow-sm flex items-center justify-center text-zinc-950 font-mono font-bold text-xs tracking-tighter transition-colors shrink-0">
                ES
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-zinc-950" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm tracking-tight text-zinc-100 leading-tight truncate">
                  EcoSpark
                </div>
                <div className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                  Operations Hub
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setShowCommandPalette(true)}
            className="w-full h-9 flex items-center justify-between px-3 bg-zinc-950/90 hover:bg-zinc-900 border border-zinc-800/90 hover:border-zinc-700 rounded-lg text-xs text-zinc-400 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span className="truncate">Quick search...</span>
            </div>
            <div className="flex items-center gap-1 font-mono text-[10px] text-zinc-400 shrink-0">
              <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 hub-kbd">
                Ctrl
              </span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 hub-kbd">
                K
              </span>
            </div>
          </button>

          <div className="space-y-1.5">
            <div className="px-2.5 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
              Workspace
            </div>
            <nav className="space-y-1">
              {primaryMenu.map((item) => {
                const Icon = item.icon;
                const isActive =
                  activeTab === item.id &&
                  (item.id !== 'gear' || gearStatusFilter === 'ALL');

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onClick}
                    className={`relative w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[13px] transition-all cursor-pointer ${
                      isActive
                        ? 'nav-item-active text-zinc-50 font-medium'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/70'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-zinc-100" />
                    )}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-zinc-100' : 'text-zinc-500'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.count !== null && (
                      <span
                        className={`font-mono tabular-nums text-[10px] px-1.5 py-0.5 rounded border ${
                          item.accent === 'sky'
                            ? 'bg-sky-950/70 border-sky-800/60 text-sky-300'
                            : isActive
                            ? 'bg-zinc-900/90 border-zinc-700 text-zinc-200'
                            : 'bg-zinc-950/80 border-zinc-800/90 text-zinc-500'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-zinc-800/70">
            <div className="px-2.5 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
              Gear Status
            </div>
            <div className="space-y-1">
              {statusShortcuts.map((shortcut) => {
                const isActive =
                  activeTab === 'gear' && gearStatusFilter === shortcut.id;
                return (
                  <button
                    key={shortcut.id}
                    type="button"
                    onClick={() => navigateToSection('gear', shortcut.id)}
                    className={`relative w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                      isActive
                        ? 'nav-item-active text-zinc-100 font-medium'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-3.5 rounded-r-full bg-zinc-200" />
                    )}
                    <div className="flex items-center gap-2.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${shortcut.dotClass}`} />
                      <span className={isActive ? shortcut.activeText : ''}>
                        {shortcut.label}
                      </span>
                    </div>
                    <span className="font-mono tabular-nums text-[10px] text-zinc-500">
                      {shortcut.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-3.5 border-t border-zinc-800/80 space-y-2.5 bg-zinc-950/40">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowActivityDrawer(true)}
              className="flex-1 h-9 flex items-center justify-between px-2.5 bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800/90 hover:border-zinc-700 rounded-lg text-xs text-zinc-300 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Activity className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="truncate">Activity & Backup</span>
              </div>
              <span className="font-mono tabular-nums text-[10px] bg-zinc-950 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">
                {activities.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              title="Reset demo data to defaults"
              className="h-9 w-9 flex items-center justify-center bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/90 hover:border-zinc-700 text-zinc-500 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between px-1 text-[10px] font-mono text-zinc-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Local Storage Sync</span>
            </span>
            <span className="text-zinc-600">v2.0</span>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="hub-topbar sticky top-0 z-30 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setActiveTab('home')}
                className="lg:hidden flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <div className="w-7 h-7 rounded-md bg-zinc-100 flex items-center justify-center text-zinc-950 font-mono font-bold text-xs tracking-tighter">
                  ES
                </div>
                <span className="font-semibold text-sm tracking-tight text-zinc-100">
                  EcoSpark
                </span>
              </button>

              <div className="hidden lg:flex items-center gap-2 text-xs min-w-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('home')}
                  className="font-mono text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  EcoSpark
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
                <span className="font-medium text-zinc-100 truncate">
                  {currentSection.title}
                </span>
                {activeTab === 'gear' && gearStatusFilter !== 'ALL' && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                      {gearStatusFilter === 'Maintenance' ? 'In Repair' : gearStatusFilter}
                    </span>
                  </>
                )}
                <span className="hidden xl:inline text-zinc-700 mx-1">·</span>
                <span className="hidden xl:inline text-zinc-500 truncate">
                  {currentSection.subtitle}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowCommandPalette(true)}
                className="lg:hidden h-8 flex items-center gap-2 px-2.5 bg-zinc-900/80 border border-zinc-800 rounded-md text-xs text-zinc-400 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5 text-zinc-500" />
                <span>Search</span>
              </button>

              <button
                type="button"
                onClick={() => setShowActivityDrawer(true)}
                title="Activity Log & Backup"
                className="lg:hidden h-8 flex items-center gap-1.5 px-2.5 bg-zinc-900/80 border border-zinc-800 text-zinc-300 rounded-md text-xs cursor-pointer"
              >
                <Activity className="w-3.5 h-3.5 text-zinc-400" />
                <span className="font-mono tabular-nums text-[10px]">
                  {activities.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                title="Reset demo data to defaults"
                className="lg:hidden h-8 w-8 flex items-center justify-center text-zinc-500 hover:text-zinc-200 bg-zinc-900/60 border border-zinc-800 rounded-md cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <div className="hidden lg:flex items-center gap-2">
                <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900/70 border border-zinc-800/90 font-mono tabular-nums text-[11px] text-zinc-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>{availableCount}/{inventory.length} gear ready</span>
                </span>
              </div>
            </div>
          </div>

          <div className="lg:hidden border-t border-zinc-800/80 bg-zinc-950/95 px-3 py-2 overflow-x-auto">
            <nav className="flex items-center gap-1.5 min-w-max text-xs">
              {primaryMenu.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onClick}
                    className={`h-8 flex items-center gap-1.5 px-3 rounded-md transition-colors cursor-pointer border ${
                      isActive
                        ? 'bg-zinc-100 text-zinc-950 border-zinc-100 font-semibold'
                        : 'bg-zinc-900/70 text-zinc-400 border-zinc-800/90 hover:text-zinc-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                    {item.count !== null && (
                      <span
                        className={`font-mono tabular-nums text-[10px] px-1 rounded ${
                          isActive
                            ? 'bg-zinc-900/15 text-zinc-900'
                            : 'text-zinc-500'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </header>

        {activeTab !== 'home' && (
          <section className="border-b border-zinc-800/80 bg-zinc-950/50 py-3 animate-view-enter">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="hub-panel border border-zinc-800/90 rounded-xl grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-zinc-800/80 overflow-hidden text-xs font-mono tabular-nums">
                <button
                  type="button"
                  onClick={() => navigateToSection('gear', 'ALL')}
                  className={`relative px-3.5 py-2.5 flex items-center justify-between transition-colors cursor-pointer ${
                    activeTab === 'gear' && gearStatusFilter === 'ALL'
                      ? 'bg-zinc-900/90'
                      : 'hover:bg-zinc-900/50'
                  }`}
                >
                  {activeTab === 'gear' && gearStatusFilter === 'ALL' && (
                    <span className="absolute inset-x-0 top-0 h-[2px] bg-zinc-200" />
                  )}
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Boxes className="w-3.5 h-3.5" />
                    <span>TOTAL</span>
                  </div>
                  <span className="text-zinc-100 font-semibold">{inventory.length}</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigateToSection('gear', 'Available')}
                  className={`relative px-3.5 py-2.5 flex items-center justify-between transition-colors cursor-pointer ${
                    activeTab === 'gear' && gearStatusFilter === 'Available'
                      ? 'bg-emerald-950/35'
                      : 'hover:bg-zinc-900/50'
                  }`}
                >
                  {activeTab === 'gear' && gearStatusFilter === 'Available' && (
                    <span className="absolute inset-x-0 top-0 h-[2px] bg-emerald-400" />
                  )}
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>AVAILABLE</span>
                  </div>
                  <span className="text-zinc-100 font-semibold">{availableCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigateToSection('gear', 'In Use')}
                  className={`relative px-3.5 py-2.5 flex items-center justify-between transition-colors cursor-pointer ${
                    activeTab === 'gear' && gearStatusFilter === 'In Use'
                      ? 'bg-amber-950/35'
                      : 'hover:bg-zinc-900/50'
                  }`}
                >
                  {activeTab === 'gear' && gearStatusFilter === 'In Use' && (
                    <span className="absolute inset-x-0 top-0 h-[2px] bg-amber-400" />
                  )}
                  <div className="flex items-center gap-2 text-amber-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>IN USE</span>
                  </div>
                  <span className="text-zinc-100 font-semibold">{inUseCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('schedule')}
                  className={`relative px-3.5 py-2.5 flex items-center justify-between transition-colors cursor-pointer ${
                    activeTab === 'schedule'
                      ? 'bg-sky-950/35'
                      : 'hover:bg-zinc-900/50'
                  }`}
                >
                  {activeTab === 'schedule' && (
                    <span className="absolute inset-x-0 top-0 h-[2px] bg-sky-400" />
                  )}
                  <div className="flex items-center gap-2 text-sky-400">
                    <CalendarClock className="w-3.5 h-3.5" />
                    <span>BOOKED</span>
                  </div>
                  <span className="text-zinc-100 font-semibold">{reservations.length}</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigateToSection('gear', 'Maintenance')}
                  className={`relative px-3.5 py-2.5 flex items-center justify-between transition-colors cursor-pointer ${
                    activeTab === 'gear' && gearStatusFilter === 'Maintenance'
                      ? 'bg-rose-950/35'
                      : 'hover:bg-zinc-900/50'
                  }`}
                >
                  {activeTab === 'gear' && gearStatusFilter === 'Maintenance' && (
                    <span className="absolute inset-x-0 top-0 h-[2px] bg-rose-400" />
                  )}
                  <div className="flex items-center gap-2 text-rose-400">
                    <Wrench className="w-3.5 h-3.5" />
                    <span>REPAIR</span>
                  </div>
                  <span className="text-zinc-100 font-semibold">{maintenanceCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('docs')}
                  className={`relative px-3.5 py-2.5 flex items-center justify-between transition-colors cursor-pointer ${
                    activeTab === 'docs'
                      ? 'bg-zinc-900/90'
                      : 'hover:bg-zinc-900/50'
                  }`}
                >
                  {activeTab === 'docs' && (
                    <span className="absolute inset-x-0 top-0 h-[2px] bg-zinc-200" />
                  )}
                  <div className="flex items-center gap-2 text-zinc-400">
                    <FileText className="w-3.5 h-3.5" />
                    <span>DOCS</span>
                  </div>
                  <span className="text-zinc-100 font-semibold">{documents.length}</span>
                </button>
              </div>
            </div>
          </section>
        )}

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-7 flex-1 w-full">
          <div key={activeTab} className="animate-view-enter">
            {activeTab === 'home' && (
              <OverviewHome
                inventory={inventory}
                documents={documents}
                reservations={reservations}
                activities={activities}
                onNavigate={navigateToSection}
                onOpenActivity={() => setShowActivityDrawer(true)}
                onInspectHolder={(holder) => setSelectedHolder(holder)}
                onQuickReturn={handleQuickReturn}
                onOpenSearch={() => setShowCommandPalette(true)}
              />
            )}

            {activeTab === 'gear' && (
              <GearLedger
                inventory={inventory}
                setInventory={setInventory}
                reservations={reservations}
                statusFilter={gearStatusFilter}
                setStatusFilter={setGearStatusFilter}
                focusedGearItem={focusedGearItem}
                onClearFocusedGear={() => setFocusedGearItem(null)}
                onLogActivity={logActivity}
                onInspectHolder={(holder) => setSelectedHolder(holder)}
                onQuickReturn={handleQuickReturn}
                onReserveGear={handleReserveGearFromLedger}
              />
            )}

            {activeTab === 'schedule' && (
              <ReservationSchedule
                inventory={inventory}
                reservations={reservations}
                setReservations={setReservations}
                onFulfillReservation={handleFulfillReservation}
                onLogActivity={logActivity}
                onInspectHolder={(holder) => setSelectedHolder(holder)}
                preselectedGearId={preselectedReserveGearId}
                onClearPreselectedGear={() => setPreselectedReserveGearId(null)}
              />
            )}

            {activeTab === 'docs' && (
              <DocumentExplorer
                key={backupVersion}
                documents={documents}
                setDocuments={setDocuments}
                focusedDocItem={focusedDocItem}
                onClearFocusedDoc={() => setFocusedDocItem(null)}
                onLogActivity={logActivity}
              />
            )}

            {activeTab === 'team' && (
              <TeamRoster
                inventory={inventory}
                documents={documents}
                reservations={reservations}
                onInspectHolder={(holder) => setSelectedHolder(holder)}
              />
            )}
          </div>
        </main>

        <footer className="border-t border-zinc-800/80 bg-zinc-950/80 py-3.5 text-xs font-mono text-zinc-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
              <span>EcoSpark Innovations · Internal Operations Hub</span>
            </div>
            <div className="text-zinc-600">Workspace Synced Locally</div>
          </div>
        </footer>
      </div>

      <ActivityFeed
        isOpen={showActivityDrawer}
        onClose={() => setShowActivityDrawer(false)}
        activities={activities}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
      />

      <StaffProfileDrawer
        holderQuery={selectedHolder}
        onClose={() => setSelectedHolder(null)}
        inventory={inventory}
        documents={documents}
        onQuickReturn={handleQuickReturn}
        onLogActivity={logActivity}
      />

      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        inventory={inventory}
        documents={documents}
        onNavigate={(tab) => navigateToSection(tab, 'ALL')}
        onSelectGear={handleSelectGearFromPalette}
        onSelectDoc={handleSelectDocFromPalette}
        onSelectPerson={(name) => setSelectedHolder(name)}
        onOpenAudit={() => setShowActivityDrawer(true)}
        onReset={() => setShowResetConfirm(true)}
      />

      <ConfirmDialog
        isOpen={showResetConfirm}
        title="Reset demo data?"
        message="This will clear any changes you made and restore the starting gear, bookings, and project files."
        confirmLabel="Reset Data"
        tone="danger"
        onConfirm={executeResetDefaults}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
}
