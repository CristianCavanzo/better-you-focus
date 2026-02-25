export type TaskStatus = "PENDING" | "DONE" | "ARCHIVED";
export type BlockStatus = "ACTIVE" | "COMPLETED" | "INTERRUPTED";

export type Category = {
  id: string;
  name: string;
  sortOrder: number;
  defaultSeconds?: number;
};

export type Task = {
  id: string;
  categoryId: string;
  title: string;
  status: TaskStatus;
  priority: number; // 1=Alta ... 4=Baja
  sortOrder: number;
  selectedAt?: string | null;
  completedAt?: string | null;
};

export type FocusBlock = {
  id: string;
  categoryId: string;
  status: BlockStatus;
  plannedSeconds: number;
  actualSeconds?: number | null;
  startedAt: string;
  endedAt?: string | null;
  endReason?: string | null;
  allSelectedCompleted: boolean;
};

export type FocusBlockSelection = {
  id: string;
  blockId: string;
  taskId: string;
  sortOrder: number;
  doneAt?: string | null;
};

export type FocusState = {
  version: 1;
  lastLocalEditAt: string;
  categories: Category[];
  tasks: Task[];
  blocks: FocusBlock[];
  selections: FocusBlockSelection[];
};

export type SyncPayload = {
  state: FocusState;
};

export type SyncResponse = {
  ok: true;
  serverSavedAt: string;
};
