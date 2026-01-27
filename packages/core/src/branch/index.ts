import { BRANCH_PREFIX } from '@appmorph/shared';

/**
 * Branch management utilities.
 */

export interface BranchInfo {
  type: 'group' | 'user';
  id: string;
  fullName: string;
}

/**
 * Generate a branch name for a group.
 */
export function getGroupBranch(groupId: string): string {
  return `${BRANCH_PREFIX.GROUP}${groupId}`;
}

/**
 * Generate a branch name for a user.
 */
export function getUserBranch(userId: string): string {
  return `${BRANCH_PREFIX.USER}${userId}`;
}

/**
 * Parse a branch name to extract type and ID.
 */
export function parseBranchName(branch: string): BranchInfo | null {
  if (branch.startsWith(BRANCH_PREFIX.GROUP)) {
    return {
      type: 'group',
      id: branch.slice(BRANCH_PREFIX.GROUP.length),
      fullName: branch,
    };
  }

  if (branch.startsWith(BRANCH_PREFIX.USER)) {
    return {
      type: 'user',
      id: branch.slice(BRANCH_PREFIX.USER.length),
      fullName: branch,
    };
  }

  return null;
}

/**
 * Check if a branch is an appmorph-managed branch.
 */
export function isAppmorphBranch(branch: string): boolean {
  return (
    branch.startsWith(BRANCH_PREFIX.GROUP) ||
    branch.startsWith(BRANCH_PREFIX.USER)
  );
}
