import type { Routine } from "./routineTypes";

const STORAGE_KEY = "fitpal.user-routines.v1";

interface RoutineStorage {
  version: number;
  routines: Routine[];
  lastUpdated: string;
}

// ============================================
// STORAGE OPERATIONS
// ============================================

function getStorage(): RoutineStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as RoutineStorage;
      return parsed;
    }
  } catch (error) {
    console.error("Failed to parse routine storage:", error);
  }
  
  return {
    version: 1,
    routines: [],
    lastUpdated: new Date().toISOString(),
  };
}

function setStorage(data: RoutineStorage): void {
  try {
    data.lastUpdated = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save routine storage:", error);
    throw new Error("Failed to save routines to storage");
  }
}

// ============================================
// PUBLIC API
// ============================================

export function loadRoutines(): Routine[] {
  const storage = getStorage();
  return storage.routines;
}

export function saveRoutines(routines: Routine[]): void {
  const storage = getStorage();
  storage.routines = routines;
  setStorage(storage);
}

export function getRoutine(routineId: string): Routine | null {
  const routines = loadRoutines();
  return routines.find((r) => r.id === routineId) ?? null;
}

export function addRoutine(routine: Routine): void {
  const routines = loadRoutines();
  routines.push(routine);
  saveRoutines(routines);
}

export function updateRoutine(routineId: string, updates: Routine | Partial<Routine>): void {
  const routines = loadRoutines();
  const index = routines.findIndex((r) => r.id === routineId);
  
  if (index === -1) {
    throw new Error(`Routine with id ${routineId} not found`);
  }
  
  routines[index] = { ...routines[index], ...updates };
  saveRoutines(routines);
}

export function deleteRoutine(routineId: string): void {
  const routines = loadRoutines();
  const filtered = routines.filter((r) => r.id !== routineId);
  saveRoutines(filtered);
}

export function setActiveRoutine(routineId: string): void {
  const routines = loadRoutines();
  const updated = routines.map((r) => ({
    ...r,
    isActive: r.id === routineId,
  }));
  saveRoutines(updated);
}

export function getActiveRoutine(): Routine | null {
  const routines = loadRoutines();
  return routines.find((r) => r.isActive) ?? null;
}

// ============================================
// MIGRATION & INITIALIZATION
// ============================================

export function initializeRoutineStore(): void {
  const storage = getStorage();
  
  // If storage is empty, add some sample data
  if (storage.routines.length === 0) {
    const sampleRoutines: Routine[] = [
      {
        id: crypto.randomUUID(),
        name: "Full Body Strength",
        description: "A comprehensive 3-day full body strength training program focused on compound movements",
        goal: "strength",
        isActive: true,
        days: [
          {
            id: crypto.randomUUID(),
            name: "Day 1 - Push Focus",
            dayOrder: 1,
            description: "Upper body push movements",
            exercises: [],
          },
          {
            id: crypto.randomUUID(),
            name: "Day 2 - Pull Focus",
            dayOrder: 2,
            description: "Upper body pull movements",
            exercises: [],
          },
          {
            id: crypto.randomUUID(),
            name: "Day 3 - Legs",
            dayOrder: 3,
            description: "Lower body compound movements",
            exercises: [],
          },
        ],
      },
      {
        id: crypto.randomUUID(),
        name: "Hypertrophy Split",
        description: "4-day bodybuilding split targeting muscle growth with higher volume",
        goal: "hypertrophy",
        isActive: false,
        days: [
          {
            id: crypto.randomUUID(),
            name: "Chest & Triceps",
            dayOrder: 1,
            exercises: [],
          },
          {
            id: crypto.randomUUID(),
            name: "Back & Biceps",
            dayOrder: 2,
            exercises: [],
          },
          {
            id: crypto.randomUUID(),
            name: "Legs",
            dayOrder: 3,
            exercises: [],
          },
          {
            id: crypto.randomUUID(),
            name: "Shoulders & Abs",
            dayOrder: 4,
            exercises: [],
          },
        ],
      },
    ];
    
    saveRoutines(sampleRoutines);
  }
}

// ============================================
// STORAGE UTILITIES
// ============================================

export function clearAllRoutines(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function exportRoutines(): string {
  const storage = getStorage();
  return JSON.stringify(storage, null, 2);
}

export function importRoutines(jsonData: string): void {
  try {
    const data = JSON.parse(jsonData) as RoutineStorage;
    setStorage(data);
  } catch (error) {
    console.error("Failed to import routines:", error);
    throw new Error("Invalid routine data format");
  }
}
