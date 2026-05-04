import { BarChart3, CalendarPlus2, FlaskConical, FolderPlus, Link2, Newspaper, PlusSquare, Trophy, UserPlus, Users, User, CalendarDays } from 'lucide-react'

export const primaryNavItems = [
  { to: '/competitions', label: 'Competitions', icon: Trophy },
  { to: '/rankings', label: 'Rankings', icon: BarChart3 },
  { to: '/news', label: 'News', icon: Newspaper },
]

export const createNavItems = [
  { to: '/players/create', label: 'Create Player', icon: UserPlus },
  { to: '/seasons/create', label: 'Create Season', icon: CalendarPlus2 },
  { to: '/leagues/create', label: 'Create League', icon: FolderPlus },
  { to: '/tournaments/create', label: 'Create Tournament', icon: PlusSquare },
  { to: '/news/create', label: 'Create News', icon: Newspaper },
  { to: '/admin/connection-requests', label: 'Connection Requests', icon: Link2 },
]

// Admin sub-nav — visible to editor + superadmin
export const adminNavItems = [
  { to: '/admin/users', label: 'Users', icon: Users, superadminOnly: true },
  { to: '/admin/seeds', label: 'Seeds', icon: FlaskConical, superadminOnly: true },
  { to: '/players', label: 'Players', icon: User },
  { to: '/seasons', label: 'Seasons', icon: CalendarDays },
  { to: '/competitions', label: 'Competitions', icon: Trophy },
]
