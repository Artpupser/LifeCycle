import type { GanttZoom } from "./task-gantt";
export type Board = { id: string; name: string; emoji: string; view: "kanban" | "gantt"; zoom: GanttZoom; revision: number };
export type BoardColumn = { id: string; name: string; color: string; position: number };
export type BoardItem = { task_id: string; column_id: string; position: number };
export type BoardState = { board: Board; columns: BoardColumn[]; items: BoardItem[] };
export type Membership = { task_id: string; board_id: string; column_id: string; board_name: string; column_name: string };
