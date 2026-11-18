import { Badge } from "../../components/Badge";
import type { UserStatus } from "../../lib/api";
import { USER_STATUS_BADGES, USER_STATUS_LABELS } from "./labels";

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return <Badge variant={USER_STATUS_BADGES[status]}>{USER_STATUS_LABELS[status]}</Badge>;
}
