/**
 * Domain Type Definitions (JSDoc)
 *
 * These types define the core domain entities for the Tennis League application.
 * Used for documentation and IDE autocomplete support.
 */

/**
 * @typedef {'superadmin'|'editor'|'player'} UserRole
 */

/**
 * User roles and permissions:
 * - superadmin: Full system access — manages users, editors, and all system settings
 * - editor: Can create and manage seasons, leagues, tournaments, players, and match results
 * - player: Can participate in leagues and view match history/rankings
 *
 * Note: editor and superadmin can ALSO be players in leagues simultaneously
 */
export const USER_ROLES = {
  SUPERADMIN: 'superadmin',
  EDITOR: 'editor',
  PLAYER: 'player',
}

/**
 * Role permissions matrix
 */
export const ROLE_PERMISSIONS = {
  superadmin: {
    canManageSuperAdmin: true,
    canManageEditors: true,
    canManageLeagues: true,
    canManagePlayers: true,
    canManageUsers: true,
    canPlayMatches: true,
    canCreateLeagues: true,
  },
  editor: {
    canManageSuperAdmin: false,
    canManageEditors: false,
    canManageLeagues: true,
    canManagePlayers: true,
    canManageUsers: false,
    canPlayMatches: true,
    canCreateLeagues: true,
  },
  player: {
    canManageSuperAdmin: false,
    canManageEditors: false,
    canManageLeagues: false,
    canManagePlayers: false,
    canManageUsers: false,
    canPlayMatches: true,
    canCreateLeagues: false,
  },
}

/**
 * @typedef {Object} User
 * @property {string} uid - Firebase Auth user ID
 * @property {string} email - User email address
 * @property {string} displayName - User display name
 * @property {UserRole} primaryRole - Primary user role (superadmin, editor, or player)
 * @property {string[]} roles - Array of all roles user has (allows editor/superadmin to also be player)
 * @property {string} createdAt - ISO timestamp of account creation
 * @property {string} updatedAt - ISO timestamp of last update
 * @property {string} [photoURL] - Optional profile photo URL
 * @property {boolean} [emailVerified] - Email verification status
 * @example
 * // Editor who is also a player
 * { uid: '123', email: 'editor@example.com', primaryRole: 'editor', roles: ['editor', 'player'] }
 * // Superadmin who is also a player
 * { uid: '456', email: 'super@example.com', primaryRole: 'superadmin', roles: ['superadmin', 'player'] }
 */

/**
 * @typedef {Object} Player
 * @property {string} id - Player document ID (same as User uid)
 * @property {string} userId - Reference to User uid
 * @property {string} displayName - Player display name
 * @property {string} [phone] - Optional phone number
 * @property {PlayerStats} stats - Aggregated player statistics
 * @property {string[]} seasonIds - Array of season IDs player is enrolled in
 * @property {string} createdAt - ISO timestamp
 * @property {string} updatedAt - ISO timestamp
 */

/**
 * @typedef {Object} PlayerStats
 * @property {number} matchesPlayed - Total matches played across all seasons
 * @property {number} matchesWon - Total matches won
 * @property {number} matchesLost - Total matches lost
 * @property {number} winRate - Win percentage (0-100)
 * @property {number} [elo] - Optional ELO rating
 */

/**
 * @typedef {'round_robin'|'knockout'|'round_robin_knockout'} CompetitionFormat
 */

/**
 * @typedef {Object} League
 * @property {string} id - League document ID
 * @property {string} seasonId - Parent season ID
 * @property {string} name - League name
 * @property {CompetitionFormat} format - League format
 * @property {number|null} numGroups - Number of groups (RR/hybrid only)
 * @property {number|null} playersPerGroup - Players per group (RR/hybrid only)
 * @property {string|null} rules - Optional league rules
 * @property {string} organizerId - User ID of league organizer
 * @property {string} createdAt - ISO timestamp
 * @property {string} updatedAt - ISO timestamp
 * @property {LeagueStatus} status - Current league status
 */

/**
 * @typedef {Object} Tournament
 * @property {string} id - Tournament document ID
 * @property {string} seasonId - Parent season ID
 * @property {string} name - Tournament name
 * @property {CompetitionFormat} format - Tournament format
 * @property {number|null} numGroups - Number of groups (RR/hybrid only)
 * @property {number|null} playersPerGroup - Players per group (RR/hybrid only)
 * @property {string} startDate - ISO date string
 * @property {string} endDate - ISO date string
 * @property {string|null} rules - Optional tournament rules
 * @property {string} organizerId - User ID of tournament organizer
 * @property {string} createdAt - ISO timestamp
 * @property {string} updatedAt - ISO timestamp
 * @property {LeagueStatus} status - Current tournament status
 */

/**
 * @typedef {'draft'|'active'|'completed'|'archived'} LeagueStatus
 */

/**
 * @typedef {Object} Season
 * @property {string} id - Season document ID
 * @property {string} name - Season name (e.g., "2026" or "2026 Spring")
 * @property {string} startDate - ISO date string
 * @property {string} endDate - ISO date string
 * @property {SeasonStatus} status - Current season status
 * @property {string} createdAt - ISO timestamp
 * @property {string} updatedAt - ISO timestamp
 */

/**
 * @typedef {'draft'|'registration'|'active'|'completed'|'cancelled'} SeasonStatus
 */

/**
 * @typedef {Object} Group
 * @property {string} id - Group document ID
 * @property {string} competitionId - Parent league/tournament ID
 * @property {'league'|'tournament'} competitionType - Competition kind
 * @property {string} name - Group label (e.g., "Group A")
 * @property {number} position - Group order in UI
 * @property {string[]} playerIds - Assigned players
 * @property {string} createdAt - ISO timestamp
 * @property {string} updatedAt - ISO timestamp
 */

/**
 * @typedef {Object} Round
 * @property {string} id - Round document ID
 * @property {string} competitionId - Parent league/tournament ID
 * @property {number} roundNumber - Sequential round number (1, 2, 3...)
 * @property {string} name - Round name (e.g., "Round 1", "Semifinals")
 * @property {'round_robin'|'knockout'} type - Round type
 * @property {string|null} groupId - Group reference for RR rounds
 * @property {string} startDate - ISO date string
 * @property {string} endDate - ISO date string
 * @property {string[]} matchIds - Match IDs in this round
 * @property {RoundStatus} status - Current round status
 * @property {string} createdAt - ISO timestamp
 * @property {string} updatedAt - ISO timestamp
 */

/**
 * @typedef {'scheduled'|'in_progress'|'completed'} RoundStatus
 */

/**
 * @typedef {Object} Match
 * @property {string} id - Match document ID
 * @property {string} roundId - Parent round ID
 * @property {string} competitionId - Parent league/tournament ID for denormalization
 * @property {'league'|'tournament'} competitionType - Competition kind
 * @property {string} player1Id - First player ID
 * @property {string} player2Id - Second player ID
 * @property {string} [scheduledDate] - ISO timestamp of scheduled match time
 * @property {MatchStatus} status - Current match status
 * @property {MatchResult} [result] - Match result (null until completed)
 * @property {string} createdAt - ISO timestamp
 * @property {string} updatedAt - ISO timestamp
 * @property {string} [completedAt] - ISO timestamp when match finished
 */

/**
 * @typedef {'scheduled'|'in_progress'|'completed'|'walkover'|'cancelled'} MatchStatus
 */

/**
 * @typedef {Object} MatchResult
 * @property {string} winnerId - Player ID of winner
 * @property {string} loserId - Player ID of loser
 * @property {SetScore[]} sets - Array of set scores
 * @property {boolean} walkover - True if match was a walkover
 * @property {string} [notes] - Optional result notes
 * @property {string} recordedBy - User ID who recorded the result
 * @property {string} recordedAt - ISO timestamp
 */

/**
 * @typedef {Object} SetScore
 * @property {number} player1Score - Games won by player 1
 * @property {number} player2Score - Games won by player 2
 * @property {number} [tiebreakScore1] - Tiebreak points for player 1
 * @property {number} [tiebreakScore2] - Tiebreak points for player 2
 */

/**
 * @typedef {Object} Ranking
 * @property {string} id - Ranking document ID (format: seasonId_playerId)
 * @property {string} seasonId - Parent season ID
 * @property {string} playerId - Player ID
 * @property {number} position - Current rank position (1-based)
 * @property {number} points - Total points earned
 * @property {number} matchesPlayed - Matches played in this season
 * @property {number} matchesWon - Matches won in this season
 * @property {number} matchesLost - Matches lost in this season
 * @property {number} winRate - Win percentage (0-100)
 * @property {number} previousPosition - Previous rank position (for trending)
 * @property {string} updatedAt - ISO timestamp of last ranking update
 */

/**
 * @typedef {Object} News
 * @property {string} id - News document ID
 * @property {string} title - News title
 * @property {string} content - News content (markdown supported)
 * @property {string} authorId - User ID of author (organizer)
 * @property {string} [leagueId] - Optional league ID (null for global news)
 * @property {string} [seasonId] - Optional season ID
 * @property {('announcement'|'result'|'update')} type - News type
 * @property {boolean} pinned - Show at top of feed
 * @property {string} createdAt - ISO timestamp
 * @property {string} publishedAt - ISO timestamp when published
 */

/**
 * @typedef {Object} Notification
 * @property {string} id - Notification document ID
 * @property {string} userId - Target user ID
 * @property {string} title - Notification title
 * @property {string} message - Notification message
 * @property {('match'|'league'|'system'|'ranking')} type - Notification type
 * @property {string} [link] - Optional link to relevant page
 * @property {boolean} read - Read status
 * @property {string} createdAt - ISO timestamp
 */

/**
 * Helper function to check if user has a specific role
 * @param {User} user - User object
 * @param {UserRole} role - Role to check
 * @returns {boolean} True if user has the role
 */
export function hasRole(user, role) {
  return user?.roles?.includes(role) || user?.primaryRole === role
}

/**
 * Helper function to check if user can perform an action
 * @param {User} user - User object
 * @param {string} permission - Permission to check (e.g., 'canManageLeagues')
 * @returns {boolean} True if user has permission
 */
export function hasPermission(user, permission) {
  const primaryPerms = ROLE_PERMISSIONS[user?.primaryRole] || {}
  if (primaryPerms[permission]) return true

  // Check additional roles
  for (const role of user?.roles || []) {
    if (ROLE_PERMISSIONS[role]?.[permission]) return true
  }
  return false
}

// Export empty object to make this a module
export {}
