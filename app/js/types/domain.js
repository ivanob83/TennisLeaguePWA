/**
 * Domain Type Definitions (JSDoc)
 * 
 * These types define the core domain entities for the Tennis League application.
 * Used for documentation and IDE autocomplete support.
 */

/**
 * @typedef {'superadmin'|'admin'|'player'} UserRole
 */

/**
 * User roles and permissions:
 * - superadmin: Full system access, can manage all leagues, users, and system settings
 * - admin: Can manage specific leagues and organize seasons/matches
 * - player: Can participate in leagues and matches
 * 
 * Note: admin and superadmin can ALSO be players in leagues simultaneously
 */
export const USER_ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  PLAYER: 'player',
};

/**
 * Role permissions matrix
 */
export const ROLE_PERMISSIONS = {
  superadmin: {
    canManageSuperAdmin: true,
    canManageAdmins: true,
    canManageLeagues: true,
    canManageUsers: true,
    canPlayMatches: true,
    canCreateLeagues: true,
  },
  admin: {
    canManageSuperAdmin: false,
    canManageAdmins: false,
    canManageLeagues: true,
    canManageUsers: false,
    canPlayMatches: true,
    canCreateLeagues: true,
  },
  player: {
    canManageSuperAdmin: false,
    canManageAdmins: false,
    canManageLeagues: false,
    canManageUsers: false,
    canPlayMatches: true,
    canCreateLeagues: false,
  },
};

/**
 * @typedef {Object} User
 * @property {string} uid - Firebase Auth user ID
 * @property {string} email - User email address
 * @property {string} displayName - User display name
 * @property {UserRole} primaryRole - Primary user role (superadmin, admin, or player)
 * @property {string[]} roles - Array of all roles user has (allows admin/superadmin to also be player)
 * @property {string} createdAt - ISO timestamp of account creation
 * @property {string} updatedAt - ISO timestamp of last update
 * @property {string} [photoURL] - Optional profile photo URL
 * @property {boolean} [emailVerified] - Email verification status
 * @example
 * // Admin who is also a player
 * { uid: '123', email: 'admin@example.com', primaryRole: 'admin', roles: ['admin', 'player'] }
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
 * @typedef {Object} League
 * @property {string} id - League document ID
 * @property {string} name - League name
 * @property {string} description - League description
 * @property {string} organizerId - User ID of league organizer
 * @property {string[]} seasonIds - Array of season IDs in this league
 * @property {LeagueSettings} settings - League configuration
 * @property {string} createdAt - ISO timestamp
 * @property {string} updatedAt - ISO timestamp
 * @property {LeagueStatus} status - Current league status
 */

/**
 * @typedef {Object} LeagueSettings
 * @property {boolean} publicJoin - Allow public registration
 * @property {number} maxPlayers - Maximum players per season
 * @property {('round_robin'|'swiss'|'knockout')} matchFormat - Match format type
 * @property {number} setsToWin - Number of sets to win a match
 * @property {boolean} tiebreak - Enable tiebreak rules
 */

/**
 * @typedef {'draft'|'active'|'completed'|'archived'} LeagueStatus
 */

/**
 * @typedef {Object} Season
 * @property {string} id - Season document ID
 * @property {string} leagueId - Parent league ID
 * @property {string} name - Season name (e.g., "Spring 2026")
 * @property {string} startDate - ISO date string
 * @property {string} endDate - ISO date string
 * @property {string[]} playerIds - Enrolled player IDs
 * @property {string[]} roundIds - Round IDs in this season
 * @property {SeasonStatus} status - Current season status
 * @property {string} createdAt - ISO timestamp
 * @property {string} updatedAt - ISO timestamp
 */

/**
 * @typedef {'draft'|'registration'|'active'|'completed'|'cancelled'} SeasonStatus
 */

/**
 * @typedef {Object} Round
 * @property {string} id - Round document ID
 * @property {string} seasonId - Parent season ID
 * @property {number} roundNumber - Sequential round number (1, 2, 3...)
 * @property {string} name - Round name (e.g., "Round 1", "Semifinals")
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
 * @property {string} seasonId - Parent season ID for denormalization
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
  return user?.roles?.includes(role) || user?.primaryRole === role;
}

/**
 * Helper function to check if user can perform an action
 * @param {User} user - User object
 * @param {string} permission - Permission to check (e.g., 'canManageLeagues')
 * @returns {boolean} True if user has permission
 */
export function hasPermission(user, permission) {
  const primaryPerms = ROLE_PERMISSIONS[user?.primaryRole] || {};
  if (primaryPerms[permission]) return true;
  
  // Check additional roles
  for (const role of (user?.roles || [])) {
    if (ROLE_PERMISSIONS[role]?.[permission]) return true;
  }
  return false;
}

// Export empty object to make this a module
export {}
