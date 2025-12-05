import { ApiClient } from "./base/ApiClient";
import { EventService } from "./events/EventService";
import { UserService } from "./user/UserService";

export type { ApiResponse } from "./base/ApiClient";
export {
  queryClient,
  queryKeys,
  invalidateQueries,
  removeQueries,
} from "./cache/QueryClient";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333";
export const apiClient = new ApiClient(API_BASE_URL);
export const userService = new UserService(apiClient);
export const eventService = new EventService(apiClient);